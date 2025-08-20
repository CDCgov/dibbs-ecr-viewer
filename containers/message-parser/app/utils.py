import dataclasses
import datetime
import json
import pathlib
import re
import uuid
from functools import cache
from pathlib import Path
from typing import Literal, Union

import fhirpathpy
import requests
from fastapi import status
from frozendict import frozendict
from lxml import etree as ET

from app.cloud.azure import AzureCredentialManager
from app.cloud.core import BaseCredentialManager
from app.cloud.gcp import GcpCredentialManager
from app.config import get_settings
from app.fhir.transport import http_request_with_reauth
from app.phdc.models import (
    Address,
    Name,
    Observation,
    Organization,
    Patient,
    PHDCInputData,
    Telecom,
)
from app.transport.http import http_request_with_retry


@cache
def load_parsing_schema(schema_name: str) -> dict:
    """
    Load a parsing schema given its name. Look in the 'custom_schemas/' directory first.
    If no custom schemas match the provided name, check the schemas provided by default
    with this service in the 'default_schemas/' directory.

    :param path: The path to an extraction schema file.
    :return: A dictionary containing the extraction schema.
    """
    custom_schema_path = Path(__file__).parent / "custom_schemas" / schema_name
    try:
        with open(custom_schema_path) as file:
            parsing_schema = json.load(file)
    except FileNotFoundError:
        try:
            default_schema_path = (
                Path(__file__).parent / "default_schemas" / schema_name
            )
            with open(default_schema_path) as file:
                parsing_schema = json.load(file)
        except FileNotFoundError:
            raise FileNotFoundError(
                f"A schema with the name '{schema_name}' could not be found."
            )

    return freeze_parsing_schema(parsing_schema)


def freeze_parsing_schema(parsing_schema: dict) -> frozendict:
    """
    Given a parsing schema dictionary, freeze it and all of its nested dictionaries
    into a single immutable dictionary.

    :param parsing_schema: A dictionary containing a parsing schema.
    :return: A frozen dictionary containing the parsing schema.
    """
    return freeze_parsing_schema_helper(parsing_schema)


def freeze_parsing_schema_helper(schema: dict) -> frozendict:
    """
    Given a parsing schema dictionary, freeze it and all of its nested dictionaries.

    :param schema: A dictionary containing a parsing schema.
    :return: A frozen dictionary containing the parsing schema.
    """
    if isinstance(schema, dict):
        for key, value in schema.items():
            if isinstance(value, dict):
                schema[key] = freeze_parsing_schema_helper(value)
        return frozendict(schema)


def get_metadata(parsed_values: dict, schema) -> dict:
    """
    Given a dictionary of parsed values and a schema, creates a dictionary containing
    metadata for each field in the parsed values dictionary.

    :param parsed_values: A dictionary containing parsed values.
    :param schema: A dictionary containing a schema.
    :return: A dictionary containing metadata for each field in the parsed values
    """
    data = {}
    for key, value in parsed_values.items():
        if key not in schema:
            data[key] = field_metadata(value=value)
        else:
            fhir_path = schema[key]["fhir_path"] if "fhir_path" in schema[key] else ""
            match = re.search(r"resourceType\s*=\s*'([^']+)'", fhir_path)
            resource_type = match.group(1) if match and match.group(1) else ""
            data_type = schema[key]["data_type"] if "data_type" in schema[key] else ""
            metadata = schema[key]["metadata"] if "metadata" in schema[key] else {}
            data[key] = field_metadata(
                value=value,
                fhir_path=fhir_path,
                data_type=data_type,
                resource_type=resource_type,
                metadata=metadata,
            )
    return data


def field_metadata(
    value: str = "",
    fhir_path: str = "",
    data_type: str = "",
    resource_type: str = "",
    metadata: dict = {},
) -> dict:
    """
    Given metadata for a field, creates a dictionary containing that metadata.

    :param value: The value of the field.
    :param fhir_path: The FHIR path of the field.
    :param data_type: The data type of the field.
    :param resource_type: The resource type of the field.
    :param metadata: Additional metadata for the field.
    :return: A dictionary containing the metadata for the field.
    """
    data = {
        "value": value,
        "fhir_path": fhir_path,
        "data_type": data_type,
        "resource_type": resource_type,
    }
    for key, key_value in metadata.items():
        data[key] = key_value
    return data


def search_for_required_values(input: dict, required_values: list) -> str:
    """
    Search for required values in the input dictionary and the environment.
    Found in the environment not present in the input dictionary that are found in the
    environment are added to the dictionary. A message is returned indicating which,
    if any, required values could not be found.

    :param input: A dictionary potentially originating from the body of a POST request
    :param required_values: A list of values to search for in the input dictionary and
    the environment.
    :return: A string message indicating if any required values could not be found and
    if so which ones.
    """

    missing_values = []

    for value in required_values:
        if input.get(value) in [None, ""]:
            if get_settings().get(value) is None:
                missing_values.append(value)
            else:
                input[value] = get_settings()[value]

    message = "All values were found."
    if missing_values != []:
        message = (
            "The following values are required, but were not included in the request "
            "and could not be read from the environment. Please resubmit the request "
            "including these values or add them as environment variables to this "
            f"service. missing values: {', '.join(missing_values)}."
        )

    return message


def convert_to_fhir(
    message: str,
    message_type: Literal["elr", "vxu", "ecr"],
    fhir_converter_url: str,
    headers: dict = {},
    credential_manager: BaseCredentialManager = None,
) -> requests.Response:
    """
    Convert a message to FHIR by making a request to an instance of the DIBBs FHIR
    conversion service.

    :param message: The serialized contents of the message to be converted to FHIR.
    :param message_type: The type of the message.
    :param fhir_converter_url: The URL of an instance of the FHIR conversion service.
    :return:

    """
    conversion_settings = {
        "elr": {"input_type": "hl7v2", "root_template": "ORU_R01"},
        "vxu": {"input_type": "hl7v2", "root_template": "VXU_V04"},
        "ecr": {"input_type": "ecr", "root_template": "EICR"},
    }

    data = {
        "input_data": message,
        "input_type": conversion_settings[message_type]["input_type"],
        "root_template": conversion_settings[message_type]["root_template"],
    }
    fhir_converter_url = fhir_converter_url + "/convert-to-fhir"
    if credential_manager:
        access_token = credential_manager.get_access_token()
        headers["Authorization"] = f"Bearer {access_token}"
        response = http_request_with_reauth(
            credential_manager=credential_manager,
            url=fhir_converter_url,
            retry_count=3,
            request_type="POST",
            allowed_methods=["POST"],
            headers=headers,
            data=data,
        )
    else:
        response = http_request_with_retry(
            url=fhir_converter_url,
            retry_count=3,
            request_type="POST",
            allowed_methods=["POST"],
            headers=headers,
            data=data,
        )

    return response


credential_managers = {"azure": AzureCredentialManager, "gcp": GcpCredentialManager}


def get_credential_manager(
    credential_manager: str, location_url: str = None
) -> BaseCredentialManager:
    """
    Return a credential manager for different cloud providers depending upon which
    one the user requests via the parameter.

    :param credential_manager: A string identifying which cloud credential
    manager is desired.
    :return: Either a Google Cloud Credential Manager or an Azure Credential Manager
    depending upon the value passed in.
    """
    credential_manager_class = credential_managers.get(credential_manager)
    result = None
    # if the credential_manager_class is not none then instantiate an instance of it
    if credential_manager_class is not None:
        if credential_manager == "azure":
            result = credential_manager_class(resource_location=location_url)
        else:
            result = credential_manager_class()

    return result


def read_json_from_assets(filename: str) -> dict:
    """
    Reads a JSON file from the assets directory.

    :param filename: The name of the file to read.
    :return: A dictionary containing the contents of the file.
    """
    return json.load(open(pathlib.Path(__file__).parent.parent / "assets" / filename))


def read_file_from_assets(filename: str) -> str:
    """
    Reads a file from the assets directory.

    :param filename: The name of the file to read.
    :return: A string containing the contents of the file.
    """
    with open(pathlib.Path(__file__).parent.parent / "assets" / filename) as file:
        return file.read()


def get_datetime_now() -> datetime.datetime:
    """
    Gets the current date and time.

    :return: A datetime object representing the current date and time.
    """
    return datetime.datetime.now()


def clean_schema(schema: dict):
    """
    Recursively remove any 'secondary_schema' fields that are None or empty.
    :param schema: the parsing schema dictionary to clean out
    """
    keys_to_delete = []
    for key, value in schema.items():
        if isinstance(value, dict):
            clean_schema(value)  # Recursively clean nested dictionaries
            if "secondary_schema" in value and not value["secondary_schema"]:
                keys_to_delete.append("secondary_schema")
        elif value is None:
            keys_to_delete.append(key)

    for key in keys_to_delete:
        del schema[key]

class FhirParser:
    def __init__(self, parsing_schema: dict, message: dict, response):
        """
        :param parsing_schema: A dictionary of parser configs, defining how to extract values from the message
        :param message: The FHIR bundle
        :param response: Response object for setting HTTP errors if needed
        """
        self.parsing_schema = parsing_schema
        self.message = message
        self.response = response

    def extract_and_apply_parsers(self) -> dict:
        return self._parse_values(self.parsing_schema, self.message) 
    
    def _parse_values(self, parsers, current_message):
        """
        Recursive parses a FHIR message based on a provided schema of FHIR paths.

        :param parsers: A dictionary of parser configs. Field names are the keys, and
            the values are objects that contain the 'fhir_path'. They may include
            a further nested `secondary_config` for recursive parsing.
        :param current_message: The FHIR message or sub-section to be evaluated
            by the current set of parsers.

        :return: A dictionary mapping schema keys to parsed values.
        """
        parsed_values = {}

        for field, field_parser in parsers.items():
            if "secondary_schema" not in field_parser:
                value = self._evaluate_fhir_path(field_parser, current_message)
                if value and type(value) is list:
                    parsed_values[field] = ",".join(map(str, value))
                else:
                    parsed_values[field] = value
            else:
                base_vals = self._evaluate_fhir_path(field_parser, current_message)

                if base_vals is None:
                    parsed_values[field] = []
                    continue

                subfield_values = []
                for base_val in base_vals:
                    if base_val is None:
                        continue
                    subfield_value = self._parse_values(
                        field_parser["secondary_schema"], base_val
                    )
                    subfield_values.append(subfield_value)
                parsed_values[field] = subfield_values

        return parsed_values

    def _evaluate_fhir_path(self, field_parser, current_message):
        """
        Evaluates the FHIR path based on the current message

        :param field_parser: The parser for a specific field, which must contain a
            `fhir_path` and may contain a `reference_lookup` and a nested `secondary_schema`.
        :param current_message: The FHIR message or sub-section to be evaluated
            by the current set of parsers.

        :return: Evaluated FHIR path result(s), or None if no results
        """
        try:
            if "reference_lookup" in field_parser:
                reference_path = self._get_reference(field_parser, current_message)
                value = fhirpathpy.evaluate(self.message, field_parser["fhir_path"], context={"ref": reference_path}) # Evaluate on full message, not current
                
                if not value or len(value) == 0:
                    return None
                return value

            if "fhir_path" in field_parser:
                value = fhirpathpy.evaluate(current_message, field_parser["fhir_path"])

            if not value or len(value) == 0:
                return None
        
            return value

        # By default, fhirpathpy will compile such that *only*
        # actual resources can be accessed, rather than data types.
        # This is fine for most cases, but sometimes the actual data
        # we want is in a list of structs rather than a list of
        # resources, such as a list of patient addresses. This
        # exception catches that and allows an ordinary property
        # search.
        except KeyError:
            try:
                accessors = (
                    field_parser["fhir_path"].split(".")[1:]
                )
                val = current_message
                for acc in accessors:
                    if "[" not in acc:
                        val = val[acc]
                    else:
                        sub_acc = acc.split("[")[1].split("]")[0]
                        val = val[acc.split("[")[0].strip()][int(sub_acc)]
                return str(val)
            except Exception:
                return None

    def _get_reference(self, field_parser, current_message):
        """
        Resolves a FHIR reference and returns a new path based on the resolved ID.

        It uses a `reference_lookup` to find a reference ID in the `current_message`.
        If a single reference is found, it uses the reference to replace a placeholder
        in the `fhir_path` and evaluates this new path against the FHIR bundle
        to return the referenced resource or value. If not, this function will raise
        an error if those references cannot be resolved (if the ID of the referenced
        object can't be found, for example).

        :param field_parser: The parser for a specific field, which must contain a
            `fhir_path` & a `reference_lookup`.
        :param current_message: The FHIR message or sub-section at the current level of
            parsing where the reference is located.
        :return: The reference to be added as context to the FHIR path, or response
            error message if the reference could not be resolved.
        """
        reference_parser = field_parser["reference_lookup"]
        reference = fhirpathpy.evaluate(current_message, reference_parser)

        if len(reference) == 0:
            self.response.status_code = status.HTTP_400_BAD_REQUEST
            return {
                "message": "Provided `reference_lookup` location does "
                "not point to a referencing identifier",
                "parsed_values": {},
            }
        # Future refactor: be able to take multiple references?
        elif len(reference) > 1:
            self.response.status_code = status.HTTP_400_BAD_REQUEST
            return {
                "message": "Provided `reference_lookup` location points "
                "to many referencing identifiers",
                "parsed_values": {},
            }

        return reference[0].split("/")[-1]


def transform_to_phdc_input_data(parsed_values: dict) -> PHDCInputData:
    """
    Transform the parsed values into a PHDCInputData object.

    :param parsed_values: A dictionary containing the values parsed out of a FHIR
        bundle.
    :return: A PHDCInputData object.
    """
    # Translate to internal data classes
    input_data = PHDCInputData()
    input_data.patient = Patient()
    input_data.organization = Organization()
    for key, value in parsed_values.items():
        match key:
            case "patient_address":
                input_data.patient.address = [Address(**address) for address in value]
            case "patient_name":
                input_data.patient.name = [Name(**name) for name in value]
            case "patient_administrative_gender_code":
                input_data.patient.administrative_gender_code = value
            case "patient_birth_time":
                input_data.patient.birth_time = value
            case "patient_race_code":
                input_data.patient.race_code = value
            case "patient_ethnic_group_code":
                input_data.patient.ethnic_group_code = value
            case "observations":
                observation_groups = {
                    "social-history": input_data.social_history_info,
                    "EXPOS": input_data.repeating_questions,
                    "clinical_info": input_data.clinical_info,
                    "vital-signs": input_data.clinical_info,
                }
                for obs in value:
                    observation_type = "clinical_info"
                    if obs["obs_type"] in observation_groups:
                        observation_type = obs["obs_type"]

                    observation_groups[observation_type].append([Observation(**obs)])

                    if "components" in obs and obs["components"] is not None:
                        components = []
                        for component in obs["components"]:
                            components.append(Observation(**component))
                        observation_groups[observation_type].append(components)

            case "custodian_represented_custodian_organization":
                organizations = []
                address_fields = set([f.name for f in dataclasses.fields(Address)])

                for entry in value:
                    organizations.append(
                        Organization(
                            name=entry["name"],
                            id=str(uuid.uuid4()),
                            address=Address(
                                **dict(
                                    filter(
                                        lambda e: e[0] in address_fields, entry.items()
                                    )
                                )
                            ),
                            telecom=Telecom(value=entry["phone"]),
                        )
                    )

                input_data.organization = organizations
            case _:
                pass
    return input_data


def get_phdc_section(
    section_title: Literal[
        "SOCIAL HISTORY INFORMATION",
        "Clinical Information",
        "REPEATING QUESTIONS",
        "header",
    ],
    tree: ET.ElementTree,
) -> Union[ET.Element, ET.ElementTree]:  # noqa: UP007 Cython does not support Union
    """
    Returns the specified section of a PHDC from a file.

    :param section_title: The section of the PHDC
    :param tree: The ElementTree fromwhich to parse the section.
    :return: A section Element containing the contents of the file per the
    section_title.
    """
    # Remove the namespaces
    root = tree.getroot()
    for elem in root.getiterator():
        elem.tag = ET.QName(elem).localname
    ET.cleanup_namespaces(root)

    if section_title == "header":
        # Remove components
        for component in root.findall("component"):
            root.remove(component)

        return root
    else:
        for component in root:
            if component.tag == "component":
                for c in component:
                    if c.tag == "structuredBody":
                        for sb in c:
                            for section in sb:
                                for title in section:
                                    if title.text == section_title:
                                        return sb
