from dataclasses import dataclass, field
from typing import Literal


@dataclass
class Telecom:
    """
    A class containing all of the data elements for a telecom element.
    """

    value: str | None = None
    type: str | None = None
    useable_period_low: str | None = None
    useable_period_high: str | None = None


@dataclass
class Address:
    """
    A class containing all of the data elements for an address element.
    """

    street_address_line_1: str | None = None
    street_address_line_2: str | None = None
    city: str | None = None
    state: str | None = None
    postal_code: str | None = None
    county: str | None = None
    country: str | None = None
    type: str | None = None
    useable_period_low: str | None = None
    useable_period_high: str | None = None


@dataclass
class Name:
    """
    A class containing all of the data elements for a name element.
    """

    prefix: str | None = None
    first: str | None = None
    middle: str | None = None
    family: str | None = None
    suffix: str | None = None
    type: str | None = None
    valid_time_low: str | None = None
    valid_time_high: str | None = None


@dataclass
class Patient:
    """
    A class containing all of the data elements for a patient element.
    """

    name: list[Name] = None
    address: list[Address] = None
    telecom: list[Telecom] = None
    administrative_gender_code: str | None = None
    race_code: str | None = None
    ethnic_group_code: str | None = None
    birth_time: str | None = None


@dataclass
class Organization:
    """
    A class containing all of the data elements for an organization element.
    """

    id: str = None
    name: str = None
    telecom: Telecom = None
    address: Address = None


@dataclass
class CodedElement:
    """
    A class containing all of the data elements for a coded element.
    """

    xsi_type: str | None = None
    code: str | None = None
    code_system: str | None = None
    code_system_name: str | None = None
    display_name: str | None = None
    value: str | None = None
    text: str | int | None = None

    def to_attributes(self) -> dict[str, str]:
        """
        Given a standard CodedElements return a dictionary that can be iterated over to
        produce the corresponding XML element.

        :return: A dictionary of the CodedElement's attributes
        """
        # Create a dictionary with XML attribute names
        attributes = {
            "{http://www.w3.org/2001/XMLSchema-instance}type": self.xsi_type,
            "code": self.code,
            "codeSystem": self.code_system,
            "codeSystemName": self.code_system_name,
            "displayName": self.display_name,
            "value": self.value,
            "text": self.text,
        }
        return {k: v for k, v in attributes.items() if v is not None}


@dataclass
class Observation:
    """
    A class containing all of the data elements for an observation element.
    """

    obs_type: str = "laboratory"
    type_code: str | None = None
    class_code: str | None = None
    code_display: str | None = None
    code_system: str | None = None
    code_system_name: str | None = None
    quantitative_value: float | None = None
    quantitative_system: str | None = None
    quantitative_code: str | None = None
    qualitative_value: str | None = None
    qualitative_system: str | None = None
    qualitative_code: str | None = None
    mood_code: str | None = None
    code_code: str | None = None
    code_code_system: str | None = None
    code_code_system_name: str | None = None
    code_code_display: str | None = None
    value_quantitative_code: str | None = None
    value_quant_code_system: str | None = None
    value_quant_code_system_name: str | None = None
    value_quantitative_value: float | None = None
    value_qualitative_code: str | None = None
    value_qualitative_code_system: str | None = None
    value_qualitative_code_system_name: str | None = None
    value_qualitative_value: str | None = None
    components: list | None = None
    code: CodedElement | None = None
    value: CodedElement | None = None
    translation: CodedElement | None = None
    text: str | None = None


@dataclass
class PHDCInputData:
    """
    A class containing all of the data to construct a PHDC document when passed to the
    PHDCBuilder.
    """

    type: Literal["case_report", "contact_record", "lab_report", "morbidity_report"] = (
        "case_report"
    )
    patient: Patient = None
    organization: list[Organization] = None
    clinical_info: list[list[Observation]] = field(default_factory=list)
    social_history_info: list[list[Observation]] = field(default_factory=list)
    repeating_questions: list[list[Observation]] = field(default_factory=list)
