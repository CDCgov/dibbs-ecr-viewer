import json
import sqlite3
from pathlib import Path
from unittest.mock import patch

import pytest

from app.utils import (
    _find_codes_by_resource_type,
    add_human_readable_reportable_condition_name,
    add_reportable_condition_extension
    convert_inputs_to_list,
    get_clean_snomed_code,
    get_concepts_dict,
    get_concepts_list,
)


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

    # get the Observation resource with the LOINC for SARS-like Coronavirus
    # and the SNOMED for a positive detected test
    observation_resource = next(
        e.get("resource")
        for e in message.get("entry", [])
        if e.get("resource", {}).get("resourceType") == "Observation"
        and e.get("resource", {}).get("id") == "ef84511f-a88a-0a84-2353-d44f641673b0"
    )

    # get the Condition resource that has the SNOMED code for covid-19
    condition_resource = next(
        e.get("resource")
        for e in message.get("entry", [])
        if e.get("resource", {}).get("resourceType") == "Condition"
        and e.get("resource", {}).get("id") == "d42c4a1f-f700-61bf-62a0-c034257d6a79"
    )

    # get the one Immunization resource that has the COVID-19 vaccine
    immunization_resource = next(
        e.get("resource")
        for e in message.get("entry", [])
        if e.get("resource", {}).get("resourceType") == "Immunization"
    )

    # get the DiagnosticReport resource with the PCR test for COVID-19
    diagnostic_resource = next(
        e.get("resource")
        for e in message.get("entry", [])
        if e.get("resource", {}).get("resourceType") == "DiagnosticReport"
    )

    # Update assertions with actual codes from the bundle
    # * LOINC code for SARS-like Coronavirus
    # * SNOMED code for "Detected (qualifier value)" - indicates a positive test result
    assert ["94310-0", "260373001"] == _find_codes_by_resource_type(
        observation_resource
    )

    # SNOMED code for "Disease caused by severe acute respiratory syndrome coronavirus 2 (disorder)"
    # this is the official SNOMED code for COVID-19
    assert ["840539006"] == _find_codes_by_resource_type(condition_resource)

    # CVX code for "COVID-19, mRNA, LNP-S, PF, 100 mcg/0.5 mL dose"
    # * specifically refers to the Moderna COVID-19 Vaccine
    assert ["207"] == _find_codes_by_resource_type(immunization_resource)

    # LOINC code for SARS-like Coronavirus
    # * standard LOINC code for COVID-19 PCR diagnostic test
    assert ["94310-0"] == _find_codes_by_resource_type(diagnostic_resource)

    # Test for a resource we don't stamp for (Patient - unchanged)
    patient_resource = next(
        e.get("resource")
        for e in message.get("entry", [])
        if e.get("resource", {}).get("resourceType") == "Patient"
    )
    assert [] == _find_codes_by_resource_type(patient_resource)

    # test for a resource we do stamp that doesn't have any codes
    del observation_resource["code"]
    del observation_resource["valueCodeableConcept"]
    assert [] == _find_codes_by_resource_type(observation_resource)


@patch("app.utils._get_condition_name_from_snomed_code")
def test_add_reportable_condition_extension(mock_get_condition_name):
    message = json.load(open(Path(__file__).parent / "assets" / "sample_ecr.json"))

    # get the Observation resource with the LOINC for SARS-like Coronavirus
    # and the SNOMED for a positive detected test
    observation_resource = next(
        e.get("resource")
        for e in message.get("entry", [])
        if e.get("resource", {}).get("resourceType") == "Observation"
        and e.get("resource", {}).get("id") == "ef84511f-a88a-0a84-2353-d44f641673b0"
    )

    # get the Condition resource that has the SNOMED code for covid-19
    condition_resource = next(
        e.get("resource")
        for e in message.get("entry", [])
        if e.get("resource", {}).get("resourceType") == "Condition"
        and e.get("resource", {}).get("id") == "d42c4a1f-f700-61bf-62a0-c034257d6a79"
    )

    # Mock the condition name lookup
    mock_get_condition_name.return_value = (
        "Disease caused by severe acute respiratory syndrome coronavirus 2"
    )

    # using SNOMED code for "Disease caused by severe acute respiratory syndrome coronavirus 2 (disorder)"
    # * this code is used below as well
    stamped_obs = add_reportable_condition_extension(
        observation_resource,
        "840539006",
    )
    found_stamp = False
    for ext in stamped_obs.get("extension", []):
        if ext == {
            "url": "https://reportstream.cdc.gov/fhir/StructureDefinition/condition-code",
            "valueCoding": {
                "code": "840539006",
                "system": "http://snomed.info/sct",
            },
        }:
            found_stamp = True
            break
    assert found_stamp

    stamped_condition = add_reportable_condition_extension(
        condition_resource, "840539006"
    )
    found_stamp = False
    for ext in stamped_condition.get("extension", []):
        if ext == {
            "url": "https://reportstream.cdc.gov/fhir/StructureDefinition/condition-code",
            "valueCoding": {
                "code": "840539006",
                "system": "http://snomed.info/sct",
            },
        }:
            found_stamp = True
            break
    assert found_stamp


@patch("app.utils._get_condition_name_from_snomed_code")
def test_add_human_readable_reportable_condition_name(mock_get_condition_name):
    message = json.load(open(Path(__file__).parent / "assets" / "sample_ecr.json"))
    observation_resource = [
        e.get("resource")
        for e in message.get("entry", [])
        if e.get("resource").get("resourceType") == "Observation"
    ][0]

    expected_condition_name = "Cyclosporiasis"
    mock_get_condition_name.return_value = expected_condition_name

    result = add_human_readable_reportable_condition_name(observation_resource)

    assert result["valueCodeableConcept"]["text"] == expected_condition_name
