import json
import sqlite3
from pathlib import Path
from unittest.mock import patch

import pytest
from app.utils import _find_codes_by_resource_type
from app.utils import add_code_extension_and_human_readable_name
from app.utils import convert_inputs_to_list
from app.utils import get_clean_snomed_code
from app.utils import get_concepts_dict
from app.utils import get_concepts_list


@pytest.fixture
def mock_db():
    with patch("sqlite3.connect", autospec=True) as mock_connect:
        mock_conn = mock_connect.return_value
        mock_conn.__enter__.return_value = mock_conn
        mock_cursor = mock_conn.cursor.return_value
        yield mock_cursor


# tests to confirm sanitize inputs work
def test_convert_inputs_to_list_single_value():
    assert convert_inputs_to_list("12345") == ["12345"]


def test_convert_inputs_to_list_multiple_values():
    assert convert_inputs_to_list("12345,67890") == ["12345", "67890"]


# tests to confirm snomed checks work
def test_get_clean_snomed_code_single():
    assert get_clean_snomed_code("12345") == ["12345"]


def test_get_clean_snomed_code_multiple():
    result = get_clean_snomed_code("12345,67890")
    assert "error" in result
    assert "2 SNOMED codes provided" in result["error"]


# Test getting clinical code list of tuples with a valid SNOMED ID
def test_get_concepts_list_normal(mock_db):
    code = 276197005
    db_result = [
        ("dxtc", "A36.3|A36", "http://hl7.org/fhir/sid/icd-10-cm", "0363|0036"),
        ("sdtc", "772150003", "http://snomed.info/sct", None),
    ]
    mock_db.fetchall.return_value = db_result
    result = get_concepts_list([code])
    assert result == [
        ("dxtc", "A36.3|A36", "http://hl7.org/fhir/sid/icd-10-cm"),
        ("dxtc", "0363|0036", "http://hl7.org/fhir/sid/icd-9-cm"),
        ("sdtc", "772150003", "http://snomed.info/sct"),
    ]


# Test with bad SNOMED code
def test_get_concepts_list_no_results(mock_db):
    code = ["junk_id"]
    mock_db.fetchall.return_value = []
    result = get_concepts_list(code)
    assert result == []


# Test SQL error messaging
def test_get_concepts_list_sql_error(mock_db):
    snomed_id = 276197005
    mock_db.execute.side_effect = sqlite3.Error("SQL error")
    result = get_concepts_list([snomed_id])
    assert "error" in result
    assert "SQL error" in result["error"]


# Test transforming clinical services list to nested dictionary
def test_get_concepts_dict_normal():
    clinical_services_list = [
        ("dxtc", "A36.3|A36", "http://hl7.org/fhir/sid/icd-10-cm"),
        ("sdtc", "772150003", "http://snomed.info/sct"),
    ]
    expected_result = {
        "dxtc": [
            {"codes": ["A36.3", "A36"], "system": "http://hl7.org/fhir/sid/icd-10-cm"}
        ],
        "sdtc": [{"codes": ["772150003"], "system": "http://snomed.info/sct"}],
    }
    result = get_concepts_dict(clinical_services_list)
    assert result == expected_result


# Test clinical services dict limiting to just sdtc
def test_get_concepts_dict_filter_services():
    clinical_services_list = [
        ("dxtc", "A36.3|A36", "http://hl7.org/fhir/sid/icd-10-cm"),
        ("sdtc", "772150003", "http://snomed.info/sct"),
    ]
    filtered_services = ["sdtc"]
    expected_result = {
        "sdtc": [{"codes": ["772150003"], "system": "http://snomed.info/sct"}],
    }
    result = get_concepts_dict(clinical_services_list, filtered_services)
    assert result == expected_result


def test_find_codes_by_resource_type():
    message = json.load(open(Path(__file__).parent / "assets" / "sample_ecr.json"))

    # Test Observation codes
    observation_resources = [
        e["resource"]
        for e in message["entry"]
        if e.get("resource", {}).get("resourceType") == "Observation"
    ]

    # Test the COVID-19 test result observation (ef84511f-a88a-0a84-2353-d44f641673b0)
    covid_test_observation = next(
        obs
        for obs in observation_resources
        if obs.get("id") == "ef84511f-a88a-0a84-2353-d44f641673b0"
    )
    assert _find_codes_by_resource_type(covid_test_observation) == [
        "94310-0",  # LOINC code for SARS-CoV-2 test
        "260373001",  # SNOMED CT code for "Detected"
    ]

    # Test the occupation observation (060a3bab-0fb6-6122-f4fe-12f352df4ff8)
    occupation_observation = next(
        obs
        for obs in observation_resources
        if obs.get("id") == "060a3bab-0fb6-6122-f4fe-12f352df4ff8"
    )
    assert _find_codes_by_resource_type(occupation_observation) == [
        "364703007",  # SNOMED CT code for "Employment detail"
        "11295-3",  # LOINC code for "Occupation history"
        "410001",  # SNOMED CT code for "Senator"
    ]

    # Test DiagnosticReport codes
    diagnostic_report = next(
        e["resource"]
        for e in message["entry"]
        if e.get("resource", {}).get("resourceType") == "DiagnosticReport"
        and e.get("resource", {}).get("id") == "e6aa3537-cb1d-9e2e-9060-08828602339a"
    )
    assert _find_codes_by_resource_type(diagnostic_report) == [
        "94310-0"
    ]  # LOINC code for SARS-CoV-2 test

    # Test Immunization codes
    immunization = next(
        e["resource"]
        for e in message["entry"]
        if e.get("resource", {}).get("resourceType") == "Immunization"
        and e.get("resource", {}).get("id") == "427d703c-b43c-53c7-e966-97ee5f217d03"
    )
    assert _find_codes_by_resource_type(immunization) == [
        "207"
    ]  # Code for COVID-19 mRNA vaccine

    # Test Patient (should return empty list as we don't extract codes from Patient)
    patient = next(
        e["resource"]
        for e in message["entry"]
        if e.get("resource", {}).get("resourceType") == "Patient"
        and e.get("resource", {}).get("id") == "edf8412c-6398-433f-8ca7-18f3214cf815"
    )
    assert _find_codes_by_resource_type(patient) == []

    # Test for a resource we do stamp that doesn't have any codes
    observation_without_codes = covid_test_observation.copy()
    del observation_without_codes["code"]
    del observation_without_codes["valueCodeableConcept"]
    assert _find_codes_by_resource_type(observation_without_codes) == []


@patch("app.utils._get_condition_name_from_snomed_code")
def test_add_code_extension_and_human_readable_name(mock_get_condition_name):
    message = json.load(open(Path(__file__).parent / "assets" / "sample_ecr.json"))

    # Test Case 1: Regular Observation (should only add extension)
    observation = next(
        e["resource"]
        for e in message["entry"]
        if e.get("resource", {}).get("resourceType") == "Observation"
        and e.get("resource", {}).get("id") == "ef84511f-a88a-0a84-2353-d44f641673b0"
    )

    stamped_obs = add_code_extension_and_human_readable_name(
        observation.copy(),
        "840539006",  # SNOMED CT code for COVID-19
    )

    # Verify extension was added
    found_stamp = False
    for ext in stamped_obs.get("extension", []):
        if (
            ext.get("url")
            == "https://reportstream.cdc.gov/fhir/StructureDefinition/condition-code"
        ):
            found_stamp = True
            assert ext["valueCoding"]["code"] == "840539006"
            assert ext["valueCoding"]["system"] == "http://snomed.info/sct"
            break
    assert found_stamp

    # Verify original valueCodeableConcept wasn't modified
    assert stamped_obs["valueCodeableConcept"] == observation["valueCodeableConcept"]

    # Test Case 2: Condition resource (should add both extension and text)
    condition = {
        "resourceType": "Condition",
        "code": {
            "coding": [
                {
                    "system": "http://snomed.info/sct",
                    "code": "64572001",
                    "display": "Condition",
                }
            ]
        },
        "valueCodeableConcept": {},
    }

    mock_get_condition_name.return_value = "SARS-CoV-2 (COVID-19)"

    stamped_condition = add_code_extension_and_human_readable_name(
        condition.copy(),
        "840539006",  # SNOMED CT code for COVID-19
    )

    # Verify extension was added
    found_stamp = False
    for ext in stamped_condition.get("extension", []):
        if (
            ext.get("url")
            == "https://reportstream.cdc.gov/fhir/StructureDefinition/condition-code"
        ):
            found_stamp = True
            assert ext["valueCoding"]["code"] == "840539006"
            assert ext["valueCoding"]["system"] == "http://snomed.info/sct"
            break
    assert found_stamp

    # Verify text was added to valueCodeableConcept for Condition
    assert stamped_condition["valueCodeableConcept"]["text"] == "SARS-CoV-2 (COVID-19)"
