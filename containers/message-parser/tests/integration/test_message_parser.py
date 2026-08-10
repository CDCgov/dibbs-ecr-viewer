import httpx
import pytest

PARSER_URL = "http://0.0.0.0:8080"
PARSE_MESSAGE = PARSER_URL + "/parse_message"


@pytest.fixture
def fhir_bundle(read_json_from_test_assets):
    # Note: Eve Everywoman FHIR bundle was synthetically modified to cover all fields in the extended schema.
    return read_json_from_test_assets("sample_fhir_bundle_eve_everywoman_modified.json")


@pytest.fixture
def test_core_schema(read_schema_from_default_schemas):
    return read_schema_from_default_schemas("core.json")


@pytest.fixture
def test_extended_schema(read_schema_from_default_schemas):
    return read_schema_from_default_schemas("extended.json")


@pytest.mark.integration
def test_health_check(setup):
    health_check_response = httpx.get(PARSER_URL)
    assert health_check_response.status_code == 200


@pytest.mark.integration
def test_openapi():
    actual_response = httpx.get(PARSER_URL + "/message-parser/openapi.json")
    assert actual_response.status_code == 200


@pytest.mark.integration
def test_parse_message(setup, test_core_schema, test_extended_schema, fhir_bundle):
    expected_core_response = {
        "message": "Parsing succeeded!",
        "parsed_values": {
            "ecr_id": "db734647-fc99-424c-a864-7e3cda82e704",
            "set_id": "31",
            "eicr_version_number": "2",
            "last_name": "Everywoman",
            "first_name": "Eve",
            "birth_date": "1974-11-24",
            "facility_name": "Good Health Hospital",
            "encounter_start_date": "2020-11-07T08:44:21-05:00",
            "rr": [
                {
                    "uuid": "a66d09ae-2b5a-4170-af3f-4ca4df7a02a6",
                    "condition": "COVID-19",
                    "condition_code": "840539006",
                    "rule_summaries": [
                        {
                            "rule_summary": "Detection of SARS-CoV-2 antibody in a clinical specimen by any method"
                        }
                    ],
                },
                {
                    "uuid": "10bd27fb-e882-4acb-8efb-ed2051b86691",
                    "condition": "Plague",
                    "condition_code": "58750007",
                    "rule_summaries": [
                        {"rule_summary": "Plague (as a diagnosis or active problem)"}
                    ],
                },
            ],
        },
    }
    expected_extended_response = {
        "message": "Parsing succeeded!",
        "parsed_values": {
            "gender": "female",
            "race": "White",
            "ethnicity": "Non Hispanic or Latino",
            "patient_addresses": [
                {
                    "use": "home",
                    "line": "2222 Home Street",
                    "city": "Ann Arbor",
                    "district": "26001",
                    "state": "MI",
                    "postal_code": "99999",
                    "country": "US",
                    "period_start": "2000-07-20T08:45:00",
                    "period_end": "2000-07-20T08:55:00",  # Synthetic
                }
            ],
            "processing_status": "RRVS19",
            "set_id": "31",
            "eicr_id": "db734647-fc99-424c-a864-7e3cda82e704",
            "eicr_version_number": "2",
            "authoring_date": "2020-11-07T09:44:21-05:00",
            "ehr_software": "Epic - Version 10.5",  # Synthetic
            "ehr_manufacturer_model": "Epic - Version 10.5",  # Synthetic
            "provider_id": "6666666666666",
            "facility_id": "2.16.840.1.113883.4.6",
            "facility_name": "Good Health Hospital",
            "encounter_type": "Ambulatory",
            "encounter_start_date": "2020-11-07T08:44:21-05:00",
            "encounter_end_date": "2020-11-08T11:21:03-05:00",
            "reason_for_visit": (
                '<div xmlns="http://www.w3.org/1999/xhtml">'
                "<p>Reason for Visit (as documented by provider): "
                "Headache, rash, and fever</p></div>"
            ),
            "active_problems": (
                "Dark stools,Paroxysmal cough,Pertussis,Diagnosis interpretation"
            ),
            "immunizations": [
                {
                    "name": (
                        "diphtheria, tetanus toxoids and acellular pertussis vaccine, "
                        "5 pertussis antigens"
                    ),
                    "effective_date": "2020-11-07",
                    "status": "completed",
                    "status_reason": None,
                },
                {
                    "name": "anthrax vaccine",
                    "effective_date": "2020-11-07",
                    "status": "completed",
                    "status_reason": None,
                },
                # Synthetic
                {
                    "name": "influenza, intradermal, quadrivalent, preservative free, injectable,influenza, intradermal, quadrivalent",
                    "effective_date": "2015-11-15",
                    "status": "not-done",
                    "status_reason": "patient objection",
                },
            ],
            "labs": [
                {
                    "uuid": "e333acb8-01e7-e1ea-e9bc-b87c9e8bfd7c",
                    "test_type": "Hematocrit Calc (Bld) [Volume fraction]",
                    "test_type_code": "20570-8",
                    "test_type_system": "http://loinc.org",
                    "test_result_qualitative": None,
                    "test_result_quantitative": "35.3",
                    "test_result_units": "%",
                    "test_result_code": None,
                    "test_result_code_display": None,
                    "test_result_code_system": None,
                    "test_result_interpretation": "Low",
                    "test_result_interpretation_code": "L",
                    "test_result_interpretation_system": (
                        "http://terminology.hl7.org/CodeSystem/"
                        "v3-ObservationInterpretation"
                    ),
                    "test_result_reference_range_low_value": "34.9",
                    "test_result_reference_range_low_units": "%",
                    "test_result_reference_range_high_value": "44.5",
                    "test_result_reference_range_high_units": "%",
                    "specimen_type": "Blood specimen",
                    "performing_lab": None,
                    "specimen_collection_date": "2020-03-09",
                },
                {
                    "uuid": "1415c94e-c259-b369-9425-ee176172d48d",
                    "test_type": "Lymphocytes Auto (Bld) [#/Vol]",
                    "test_type_code": "731-0",
                    "test_type_system": "http://loinc.org",
                    "test_result_qualitative": None,
                    "test_result_quantitative": "5.2",
                    "test_result_units": "10*3/uL",
                    "test_result_code": None,
                    "test_result_code_display": None,
                    "test_result_code_system": None,
                    "test_result_interpretation": "High",
                    "test_result_interpretation_code": "H",
                    "test_result_interpretation_system": (
                        "http://terminology.hl7.org/CodeSystem/"
                        "v3-ObservationInterpretation"
                    ),
                    "test_result_reference_range_low_value": "1",
                    "test_result_reference_range_low_units": "10*3/uL",
                    "test_result_reference_range_high_value": "4.8",
                    "test_result_reference_range_high_units": "10*3/uL",
                    "specimen_type": "Blood specimen",
                    "performing_lab": None,
                    "specimen_collection_date": "2020-03-09",
                },
                {
                    "uuid": "9066312e-2cd6-fc9d-223e-090aa5e566d8",
                    "test_type": "B. pertussis Ab Qn (S)",
                    "test_type_code": "11585-7",
                    "test_type_system": "http://loinc.org",
                    "test_result_qualitative": None,
                    "test_result_quantitative": "100",
                    "test_result_units": "[iU]/mL",
                    "test_result_code": None,
                    "test_result_code_display": None,
                    "test_result_code_system": None,
                    "test_result_interpretation": "High",
                    "test_result_interpretation_code": "H",
                    "test_result_interpretation_system": (
                        "http://terminology.hl7.org/CodeSystem/"
                        "v3-ObservationInterpretation"
                    ),
                    "test_result_reference_range_low_value": None,
                    "test_result_reference_range_low_units": None,
                    "test_result_reference_range_high_value": "45",
                    "test_result_reference_range_high_units": "[iU]/mL",
                    "specimen_type": None,
                    "performing_lab": None,
                    "specimen_collection_date": None,
                },
                {
                    "uuid": "d9915885-4dd6-2c75-851c-419cf0438d37",
                    "test_type": (
                        "Bordetella pertussis in Throat by Organism specific culture,"
                        "B. pertussis Org specific cx Ql (Throat)"
                    ),
                    "test_type_code": "local_code_pertussis,548-8",
                    "test_type_system": (
                        "urn:oid:2.16.840.1.113883.1.2.3.665,http://loinc.org"
                    ),
                    "test_result_qualitative": None,
                    "test_result_quantitative": None,
                    "test_result_units": None,
                    "test_result_code": "5247005",
                    "test_result_code_display": "Bordetella pertussis",
                    "test_result_code_system": "http://snomed.info/sct",
                    "test_result_interpretation": "Abnormal",
                    "test_result_interpretation_code": "A",
                    "test_result_interpretation_system": (
                        "http://terminology.hl7.org/CodeSystem/"
                        "v3-ObservationInterpretation"
                    ),
                    "test_result_reference_range_low_value": None,
                    "test_result_reference_range_low_units": None,
                    "test_result_reference_range_high_value": None,
                    "test_result_reference_range_high_units": None,
                    "specimen_type": None,
                    "performing_lab": None,
                    "specimen_collection_date": None,
                },
                # Synthetic
                {
                    "uuid": "7ea37105-1ac1-cd38-764b-2e39e6e68f69",
                    "test_type": "CHLAMURETHRA",
                    "test_type_code": "314330",
                    "test_type_system": "urn:oid:1.2.840.113619.21.100.12.1053.139060385287897942",
                    "test_result_qualitative": "NOT DETECTED",
                    "test_result_quantitative": None,
                    "test_result_units": None,
                    "test_result_code": None,
                    "test_result_code_display": None,
                    "test_result_code_system": None,
                    "test_result_interpretation": None,
                    "test_result_interpretation_code": None,
                    "test_result_interpretation_system": None,
                    "test_result_reference_range_low_value": None,
                    "test_result_reference_range_low_units": None,
                    "test_result_reference_range_high_value": None,
                    "test_result_reference_range_high_units": None,
                    "specimen_type": None,
                    "performing_lab": "Fake City LABORATORY",
                    "specimen_collection_date": None,
                },
            ],
            "birth_sex": "F",
            "gender_identity": "Female-to-male transsexual",
            "homelessness_status": "Homeless",
            "tribal_affiliation": ("Fort Mojave Indian Tribe of Arizona, California"),
            "tribal_enrollment_status": "True",
            "current_job_title": (
                "Nursing, psychiatric, and home health aides,"
                "Certified Nursing Assistant (CNA) [Nursing Assistants]"
            ),
            "current_job_industry": ("Nursing care facilities,Home nursing services"),
            "usual_occupation": (
                "Nursing, psychiatric, and home health aides,"
                "Certified Nursing Assistant (CNA) [Nursing Assistants]"
            ),
            "usual_industry": ("Nursing care facilities,Home nursing services"),
            "preferred_language": "English",
            "pregnancy_status": "Pregnancy",
            "ecr_id": "db734647-fc99-424c-a864-7e3cda82e704",
            "last_name": "Everywoman",
            "first_name": "Eve",
            "birth_date": "1974-11-24",
            "rr": [
                {
                    "uuid": "a66d09ae-2b5a-4170-af3f-4ca4df7a02a6",
                    "condition": "COVID-19",
                    "condition_code": "840539006",
                    "rule_summaries": [
                        {
                            "rule_summary": (
                                "Detection of SARS-CoV-2 antibody in a clinical "
                                "specimen by any method"
                            )
                        }
                    ],
                },
                {
                    "uuid": "10bd27fb-e882-4acb-8efb-ed2051b86691",
                    "condition": "Plague",
                    "condition_code": "58750007",
                    "rule_summaries": [
                        {"rule_summary": ("Plague (as a diagnosis or active problem)")}
                    ],
                },
            ],
        },
    }

    # Core schema
    request_core = {
        "message_format": "fhir",
        "parsing_schema": test_core_schema,
        "message": fhir_bundle,
    }
    parsing_response_core = httpx.post(PARSE_MESSAGE, json=request_core)

    assert parsing_response_core.status_code == 200
    assert parsing_response_core.json() == expected_core_response

    # Extended schema
    request_extended = {
        "message_format": "fhir",
        "parsing_schema": test_extended_schema,
        "message": fhir_bundle,
    }
    parsing_response_extended = httpx.post(PARSE_MESSAGE, json=request_extended)

    print(parsing_response_extended.json())

    assert parsing_response_extended.status_code == 200
    assert parsing_response_extended.json() == expected_extended_response
