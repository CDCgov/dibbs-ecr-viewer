import datetime
import json
import pathlib
import re
from collections import defaultdict
from functools import cache
from pathlib import Path
from typing import Literal

import fhirpathpy
import requests
from fastapi import status
from frozendict import frozendict

from app.cloud.azure import AzureCredentialManager
from app.cloud.core import BaseCredentialManager
from app.cloud.gcp import GcpCredentialManager
from app.config import get_settings
from app.fhir.transport import http_request_with_reauth
from app.transport.http import http_request_with_retry

FAST_LOOKUP_MISS = object()
FHIR_PATH_VALUE_PHASE = "value"
REFERENCE_LOOKUP_PHASE = "reference_lookup"
REFERENCE_TARGET_SELECTOR = re.compile(
    r"Bundle\.entry\.resource"
    r"\.where\(\s*resourceType\s*=\s*'(?P<resource_type>[^']+)'"
    r"(?:\s+and\s+id\s*=\s*%ref)?\s*\)"
    r"(?:\.where\(\s*id\s*=\s*%ref\s*\))?"
)
LAB_FIELD_ACCESSORS = {
    "labs.uuid": ["id"],
    "labs.test_type": ["code", "coding", "display"],
    "labs.test_type_code": ["code", "coding", "code"],
    "labs.test_type_system": ["code", "coding", "system"],
    "labs.test_result_qualitative": ["valueString"],
    "labs.test_result_quantitative": ["valueQuantity", "value"],
    "labs.test_result_units": ["valueQuantity", "unit"],
    "labs.test_result_code": ["valueCodeableConcept", "coding", "code"],
    "labs.test_result_code_display": ["valueCodeableConcept", "coding", "display"],
    "labs.test_result_code_system": ["valueCodeableConcept", "coding", "system"],
    "labs.test_result_interpretation": ["interpretation", "coding", "display"],
    "labs.test_result_interpretation_code": ["interpretation", "coding", "code"],
    "labs.test_result_interpretation_system": ["interpretation", "coding", "system"],
    "labs.test_result_interp": ["interpretation", "coding", "display"],
    "labs.test_result_interp_code": ["interpretation", "coding", "code"],
    "labs.test_result_interp_system": ["interpretation", "coding", "system"],
    "labs.test_result_reference_range_low_value": ["referenceRange", "low", "value"],
    "labs.test_result_reference_range_low_units": ["referenceRange", "low", "unit"],
    "labs.test_result_reference_range_high_value": ["referenceRange", "high", "value"],
    "labs.test_result_reference_range_high_units": ["referenceRange", "high", "unit"],
    "labs.performing_lab": ["performer", "display"],
}


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
        self.reference_lookup_cache = {}
        self.entry_by_reference = None
        self.reference_by_resource_identity = None
        self.specimen_references_by_observation = None

    def parse(self) -> dict:
        """
        Extracts values from the FHIR bundle by applying the parsing schema
        """
        return self._parse_values(self.parsing_schema, self.message)

    def _parse_values(self, parsers, current_message, field_prefix=""):
        """
        Recursively parses a FHIR message based on a provided schema of FHIR paths.

        :param parsers: A dictionary of parser configs. Field names are the keys, and
            the values are objects that contain the 'fhir_path'. They may include
            a further nested `secondary_schema` for recursive parsing.
        :param current_message: The FHIR message or sub-section to be evaluated
            by the current set of parsers.
        :param field_prefix: The dot-separated schema path prefix for nested fields.
            Used to build the full field path, such as `labs.specimen_type`, for
            optimized evaluation and reference lookup caching.

        :return: A dictionary mapping schema keys to parsed values.
        """
        parsed_values = {}

        for field, field_parser in parsers.items():
            field_path = f"{field_prefix}.{field}" if field_prefix else field
            if "secondary_schema" not in field_parser:
                value = self._evaluate_fhir_path(
                    field_parser, current_message, field_path
                )
                if value:
                    parsed_values[field] = ",".join(map(str, value))
                else:
                    parsed_values[field] = None
            else:
                base_vals = self._evaluate_fhir_path(
                    field_parser, current_message, field_path
                )

                subfield_values = []
                for base_val in base_vals:
                    if base_val is None:
                        continue
                    subfield_value = self._parse_values(
                        field_parser["secondary_schema"], base_val, field_path
                    )
                    subfield_values.append(subfield_value)
                parsed_values[field] = subfield_values

        return parsed_values

    def _get_bundle_resources(self):
        """
        Returns resources from a FHIR Bundle message.

        :return: A list of FHIR resources.
        """
        if not isinstance(self.message, dict):
            return []
        entries = self.message.get("entry", [])
        return [
            entry.get("resource")
            for entry in entries
            if isinstance(entry, dict) and isinstance(entry.get("resource"), dict)
        ]

    def _reference_index(self):
        """
        Builds indexes for resolving references and identifying Bundle resources.

        A reference may match an entry's complete ``fullUrl`` (including a
        ``urn:uuid``) or the conventional ``ResourceType/id`` form. The reverse
        index records one complete reference for each resource so optimized
        chained lookups can retain reference identity instead of reducing it to
        an ID.

        :return: A dictionary of Bundle entries keyed by complete references.
        """
        if self.entry_by_reference is not None:
            return self.entry_by_reference

        self.entry_by_reference = {}
        self.reference_by_resource_identity = {}
        if not isinstance(self.message, dict):
            return self.entry_by_reference

        for entry in self.message.get("entry", []):
            if not isinstance(entry, dict):
                continue
            resource = entry.get("resource")
            if not isinstance(resource, dict):
                continue

            full_url = entry.get("fullUrl")
            resource_type = resource.get("resourceType")
            resource_id = resource.get("id")
            relative_reference = (
                f"{resource_type}/{resource_id}"
                if resource_type and resource_id
                else None
            )

            if isinstance(full_url, str) and full_url:
                self.entry_by_reference[full_url] = entry
                self.reference_by_resource_identity[id(resource)] = full_url
            if relative_reference:
                self.entry_by_reference[relative_reference] = entry
                self.reference_by_resource_identity.setdefault(
                    id(resource), relative_reference
                )

        return self.entry_by_reference

    def _resolve_reference(self, reference):
        """
        Resolve a complete Bundle reference to its resource.

        Both exact ``entry.fullUrl`` and ``ResourceType/id`` references are
        supported.

        :param reference: A complete FHIR reference.
        :return: The referenced resource, or ``None`` when it is not in the Bundle.
        """
        if reference is None:
            return None
        entry = self._reference_index().get(str(reference))
        return entry.get("resource") if entry else None

    def _reference_for_resource(self, resource):
        """Return a complete Bundle reference for a resource when available."""
        self._reference_index()
        reference = self.reference_by_resource_identity.get(id(resource))
        if reference:
            return reference

        # fhirpathpy returns copied dictionaries for selected resources, so an
        # identity lookup is not always possible. Match that copy back to its
        # Bundle entry before falling back to ResourceType/id.
        if isinstance(self.message, dict):
            for entry in self.message.get("entry", []):
                if isinstance(entry, dict) and entry.get("resource") == resource:
                    full_url = entry.get("fullUrl")
                    if isinstance(full_url, str) and full_url:
                        return full_url

        resource_type = resource.get("resourceType")
        resource_id = resource.get("id")
        if resource_type and resource_id:
            return f"{resource_type}/{resource_id}"
        return None

    def _reference_key(self, reference):
        """Return a stable key that treats equivalent reference forms alike."""
        resource = self._resolve_reference(reference)
        if resource is not None:
            return ("resource", id(resource))
        return ("reference", str(reference))

    def _referenced_resource_path(self, fhir_path):
        """
        Convert a Bundle-level reference path into a resource-relative path.

        Parsing schemas identify a target with either a combined
        ``where(resourceType = 'Type' and id = %ref)`` or two chained ``where``
        clauses. Once the reference has selected the Bundle entry, those selectors
        are replaced with the resource type and the remainder is evaluated against
        ``entry.resource`` directly.

        :param fhir_path: Bundle-level path from the parsing schema.
        :return: The expected resource type and relative FHIRPath, or two
            ``None`` values if the schema path is incompatible.
        """
        matches = list(REFERENCE_TARGET_SELECTOR.finditer(fhir_path))
        resource_types = {match.group("resource_type") for match in matches}
        if (
            not matches
            or len(resource_types) != 1
            or any("%ref" not in match.group(0) for match in matches)
        ):
            return None, None

        resource_type = next(iter(resource_types))
        resource_path = REFERENCE_TARGET_SELECTOR.sub(
            resource_type,
            fhir_path,
        )
        return resource_type, resource_path

    def _evaluate_referenced_resource(self, field_parser, reference, field_path):
        """Resolve a reference, then evaluate its schema path on the resource."""
        resource_type, resource_path = self._referenced_resource_path(
            field_parser["fhir_path"]
        )
        resource = self._resolve_reference(reference)
        if resource is None or resource.get("resourceType") != resource_type:
            return []

        return self._evaluate_fhir_path_value(
            resource,
            resource_path,
            field_path=field_path,
        )

    def _specimen_reference_index(self):
        """
        Builds an index from lab Observations to specimen references.

        Each DiagnosticReport connects result Observations to all of the report's
        Specimen references. This index lets specimen fields skip the expensive
        FHIRPath search across DiagnosticReports.

        Equivalent fullUrl and ResourceType/id references resolve to the same
        Observation key.

        :return: A dictionary keyed by Observation identity or reference.
        """
        if self.specimen_references_by_observation is not None:
            return self.specimen_references_by_observation

        self.specimen_references_by_observation = defaultdict(list)
        for resource in self._get_bundle_resources():
            if resource.get("resourceType") != "DiagnosticReport":
                continue

            specimen_references = [
                specimen.get("reference")
                for specimen in resource.get("specimen") or []
                if specimen.get("reference")
            ]
            if not specimen_references:
                continue

            for result in resource.get("result") or []:
                result_reference = result.get("reference")
                if not result_reference:
                    continue
                observation_key = self._reference_key(result_reference)
                self.specimen_references_by_observation[observation_key].extend(
                    specimen_references
                )

        return self.specimen_references_by_observation

    def _extract_values(self, value, accessors):
        """
        Extracts values from a nested dictionary/list structure.

        The caller passes in the object to inspect, which may be the current Observation or a resource
        retrieved from an index such as `resource_by_type_and_id`. The accessors
        describe the path to walk through that object. For example,
        `["code", "coding", "display"]` walks `Observation.code.coding.display`.

        When an intermediate value is a list, this walks the same remaining
        accessors for each list item and flattens the results. Integer accessors
        select a specific list item, which supports paths like `["location", 0,
        "id"]`.

        :param value: The current value to inspect.
        :param accessors: Remaining property names or list indexes to walk.
        :return: A flat list of extracted values.
        """
        if value is None:
            return []
        if not accessors:
            if isinstance(value, list):
                return value
            return [value]
        if isinstance(accessors[0], int):
            if not isinstance(value, list):
                return []
            try:
                return self._extract_values(value[accessors[0]], accessors[1:])
            except IndexError:
                return []
        if isinstance(value, list):
            extracted_values = []
            for item in value:
                extracted_values.extend(self._extract_values(item, accessors))
            return extracted_values
        if not isinstance(value, dict):
            return []
        return self._extract_values(value.get(accessors[0]), accessors[1:])

    def _try_get_field_path_without_fhirpath(
        self,
        current_message,
        fhir_path,
        field_path,
        evaluation_phase,
        context=None,
    ):
        """
        Attempts to evaluate supported schema fields without fhirpathpy.

        This is a fast path, not only a cache lookup. It may read directly from the
        current Observation, use the specimen reference index, or use the resource
        index for Specimen values. Unsupported fields return FHIR_PATH_CACHE_MISS
        so the caller can fall back to standard FHIRPath evaluation.

        :param current_message: The FHIR message or sub-section to evaluate.
        :param fhir_path: The FHIRPath expression being evaluated.
        :param field_path: The schema field path being evaluated.
        :param evaluation_phase: Whether this is a field value or reference lookup.
        :param context: Optional FHIRPath context variables.
        :return: A result list, or FAST_LOOKUP_MISS if unsupported.
        """
        if (
            evaluation_phase == FHIR_PATH_VALUE_PHASE
            and context is None
            and field_path in LAB_FIELD_ACCESSORS
            and isinstance(current_message, dict)
            and current_message.get("resourceType") == "Observation"
        ):
            return self._extract_values(
                current_message, LAB_FIELD_ACCESSORS[field_path]
            )

        if (
            evaluation_phase == REFERENCE_LOOKUP_PHASE
            and context is None
            and isinstance(current_message, dict)
        ):
            resource_type = current_message.get("resourceType")
            if resource_type and fhir_path == f"{resource_type}.id":
                reference = self._reference_for_resource(current_message)
                return [reference] if reference else []

        if current_message is not self.message or context is None:
            return FAST_LOOKUP_MISS

        reference = context.get("ref")
        if not reference:
            return []

        if (
            evaluation_phase == REFERENCE_LOOKUP_PHASE
            and "DiagnosticReport" in fhir_path
            and ".specimen" in fhir_path
        ):
            reference_key = self._reference_key(reference)
            return list(self._specimen_reference_index().get(reference_key, []))

        if evaluation_phase != FHIR_PATH_VALUE_PHASE:
            return FAST_LOOKUP_MISS

        return FAST_LOOKUP_MISS

    def _evaluate_fhir_path_value(
        self,
        current_message,
        fhir_path,
        context=None,
        field_path=None,
        evaluation_phase=FHIR_PATH_VALUE_PHASE,
    ):
        """
        Evaluates a FHIRPath expression, using optimized direct/index lookups when
        available.

        :param current_message: The FHIR message or sub-section to evaluate.
        :param fhir_path: The FHIRPath expression to evaluate.
        :param context: Optional FHIRPath context variables.
        :param field_path: The schema field path being evaluated.
        :param evaluation_phase: Whether this is a field value or reference lookup.
        :return: A list of values from the optimized lookup or fhirpathpy.
        """
        fast_lookup_value = self._try_get_field_path_without_fhirpath(
            current_message, fhir_path, field_path, evaluation_phase, context
        )
        if fast_lookup_value is not FAST_LOOKUP_MISS:
            return fast_lookup_value
        if context is None:
            return fhirpathpy.evaluate(current_message, fhir_path)

        # Fall back to evaluating via FHIR path
        return fhirpathpy.evaluate(current_message, fhir_path, context=context)

    def _evaluate_fhir_path(self, field_parser, current_message, field_path):
        """
        Evaluates the FHIRPath for a field based on the current message.

        :param field_parser: The parser for a specific field, which must contain a
            `fhir_path` and may contain a `reference_lookup` and a nested `secondary_schema`.
        :param current_message: The FHIR message or sub-section to be evaluated
            by the current set of parsers.
        :param field_path: The dot-separated schema path for the field being parsed.

        :return: Evaluated FHIRPath result(s), or an empty list if no results.
        """
        try:
            if "reference_lookup" in field_parser:
                reference_paths = self._get_reference(
                    field_parser, current_message, field_path
                )
                value = []
                for reference in reference_paths:
                    value.extend(
                        self._evaluate_referenced_resource(
                            field_parser, reference, field_path
                        )
                    )
            elif "fhir_path" in field_parser:
                value = self._evaluate_fhir_path_value(
                    current_message, field_parser["fhir_path"], field_path=field_path
                )

            if not value:
                return []
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
                accessors = field_parser["fhir_path"].split(".")[1:]
                val = current_message
                for acc in accessors:
                    if "[" not in acc:
                        val = val[acc]
                    else:
                        sub_acc = acc.split("[")[1].split("]")[0]
                        val = val[acc.split("[")[0].strip()][int(sub_acc)]
                return [str(val)]
            except Exception:
                return []

    def _get_reference(self, field_parser, current_message, field_path):
        """
        Resolves one or more FHIR reference lookups for a parser field.

        It uses a `reference_lookup` to find a reference ID in the `current_message`.
        `reference_lookup` may be a string or a list of strings. If it is a list of
        strings, it evaluates each step in order, passing the previously resolved
        reference as `%ref` to the next step.

        Every step except the last must resolve to exactly one reference, since the
        parser has no way to choose which reference to follow through an
        intermediate hop. The final step may resolve to any number of references
        (e.g. a DiagnosticReport with multiple specimens) - all of them are
        returned so the caller can fan out over each one.

        If a step finds no matching reference, this treats it as missing data and
        carries forward an empty reference so the downstream lookup resolves to
        missing data instead of failing the entire parse.

        :param field_parser: The parser for a specific field, which must contain a
            `fhir_path` & a `reference_lookup`.
        :param current_message: The FHIR message or sub-section at the current level of
            parsing where the reference is located.
        :param field_path: The dot-separated schema path for the field being parsed.
        :return: The list of complete final reference values.
        """
        reference_parser = field_parser["reference_lookup"]
        reference = None
        message = current_message

        if isinstance(reference_parser, str):
            reference_parser = [reference_parser]

        # Convert the reference lookup list to a tuple so it can be used in a dict key.
        reference_lookup_steps = tuple(reference_parser)
        current_message_cache_key = id(current_message)
        reference_parser_cache_key = (
            current_message_cache_key,
            reference_lookup_steps,
        )

        if reference_parser_cache_key in self.reference_lookup_cache:
            return self.reference_lookup_cache[reference_parser_cache_key]

        last_step = len(reference_parser) - 1
        references = [""]
        for step, ref_parser in enumerate(reference_parser):
            if reference:
                curr_ref = self._evaluate_fhir_path_value(
                    self.message,
                    ref_parser,
                    context={"ref": reference},
                    field_path=field_path,
                    evaluation_phase=REFERENCE_LOOKUP_PHASE,
                )
            else:
                curr_ref = self._evaluate_fhir_path_value(
                    message,
                    ref_parser,
                    field_path=field_path,
                    evaluation_phase=REFERENCE_LOOKUP_PHASE,
                )

            if len(curr_ref) == 0:
                # No matching reference was found. Treat as missing data and
                # propagate an empty reference so the downstream lookup resolves to
                # a null value instead of failing the entire parse.
                curr_ref = [""]
            elif len(curr_ref) > 1 and step != last_step:
                self.response.status_code = status.HTTP_400_BAD_REQUEST
                raise ValueError(
                    "Provided `reference_lookup` location points "
                    "to many referencing identifiers"
                )

            if step == last_step:
                references = [str(ref) for ref in curr_ref]
            else:
                reference = str(curr_ref[0])

        # Cache the final references for this message object and reference chain.
        self.reference_lookup_cache[reference_parser_cache_key] = references
        return references
