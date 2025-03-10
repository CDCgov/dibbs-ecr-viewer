import copy
import json
import pathlib

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

test_bundle = json.load(
    open(pathlib.Path(__file__).parent / "assets" / "single_patient_bundle.json")
)


def test_standardize_names_success():
    expected_response = {
        "status_code": 200,
        "message": None,
        "bundle": copy.deepcopy(test_bundle),
    }
    expected_response["bundle"]["entry"][0]["resource"]["name"][0]["family"] = "SMITH"
    expected_response["bundle"]["entry"][0]["resource"]["name"][0]["given"][0] = (
        "DEEDEE"
    )

    actual_response = client.post(
        "/fhir/harmonization/standardization/standardize_names",
        json={"data": test_bundle},
    )
    assert actual_response.json() == expected_response


def test_standardize_names_missing_data():
    actual_response = client.post(
        "/fhir/harmonization/standardization/standardize_names",
        json={},
    )
    assert actual_response.json() == {
        "detail": [
            {
                "type": "missing",
                "loc": ["body", "data"],
                "msg": "Field required",
                "input": {},
            }
        ]
    }


def test_standardize_names_not_fhir():
    invalid_bundle = copy.deepcopy(test_bundle)
    invalid_bundle["resourceType"] = ""

    actual_response = client.post(
        "/fhir/harmonization/standardization/standardize_names",
        json={"data": invalid_bundle},
    )

    assert actual_response.json() == {
        "detail": [
            {
                "type": "assertion_error",
                "loc": ["body", "data"],
                "msg": "Assertion failed, Must provide a FHIR resource or bundle",
                "input": {
                    "resourceType": "",
                    "id": "bundle-transaction",
                    "meta": {"lastUpdated": "2018-03-11T11:22:16Z"},
                    "type": "transaction",
                    "entry": [
                        {
                            "resource": {
                                "resourceType": "Patient",
                                "name": [
                                    {
                                        "family": "Smith",
                                        "given": ["DeeDee"],
                                        "use": "official",
                                    }
                                ],
                                "gender": "female",
                                "telecom": [{"system": "phone", "value": "8015557777"}],
                                "address": [
                                    {
                                        "line": ["123 Main St."],
                                        "city": "Anycity",
                                        "state": "CA",
                                        "postalCode": "12345",
                                        "country": "USA",
                                    }
                                ],
                                "birthDate": "1955-11-05",
                            },
                            "request": {"method": "POST", "url": "Patient"},
                        }
                    ],
                },
                "ctx": {"error": {}},
            }
        ]
    }


def test_standardize_names_bad_parameters():
    actual_response = client.post(
        "/fhir/harmonization/standardization/standardize_names",
        json={
            "data": test_bundle,
            "trim": "",
            "overwrite": "",
            "case": "",
            "remove_numbers": "",
        },
    )
    assert actual_response.json() == {
        "detail": [
            {
                "type": "bool_parsing",
                "loc": ["body", "trim"],
                "msg": "Input should be a valid boolean, unable to interpret input",
                "input": "",
            },
            {
                "type": "bool_parsing",
                "loc": ["body", "overwrite"],
                "msg": "Input should be a valid boolean, unable to interpret input",
                "input": "",
            },
            {
                "type": "literal_error",
                "loc": ["body", "case"],
                "msg": "Input should be 'upper', 'lower' or 'title'",
                "input": "",
                "ctx": {"expected": "'upper', 'lower' or 'title'"},
            },
            {
                "type": "bool_parsing",
                "loc": ["body", "remove_numbers"],
                "msg": "Input should be a valid boolean, unable to interpret input",
                "input": "",
            },
        ]
    }


def test_standardize_phones_success():
    expected_response = {
        "status_code": 200,
        "message": None,
        "bundle": copy.deepcopy(test_bundle),
    }
    expected_response["bundle"]["entry"][0]["resource"]["telecom"][0]["value"] = (
        "+18015557777"
    )

    actual_response = client.post(
        "/fhir/harmonization/standardization/standardize_phones",
        json={"data": test_bundle},
    )
    assert actual_response.json() == expected_response


def test_standardize_phones_missing_data():
    actual_response = client.post(
        "/fhir/harmonization/standardization/standardize_phones",
        json={},
    )
    assert actual_response.json() == {
        "detail": [
            {
                "type": "missing",
                "loc": ["body", "data"],
                "msg": "Field required",
                "input": {},
            }
        ]
    }


def test_standardize_phones_bad_overwrite_value():
    actual_response = client.post(
        "/fhir/harmonization/standardization/standardize_phones",
        json={
            "data": test_bundle,
            "overwrite": "",
        },
    )
    assert actual_response.json() == {
        "detail": [
            {
                "type": "bool_parsing",
                "loc": ["body", "overwrite"],
                "msg": "Input should be a valid boolean, unable to interpret input",
                "input": "",
            }
        ]
    }


def test_standardize_dob_success():
    expected_response = {
        "status_code": 200,
        "message": None,
        "bundle": copy.deepcopy(test_bundle),
    }
    expected_response["bundle"]["entry"][0]["resource"]["birthDate"] = "1955-11-05"

    actual_response = client.post(
        "/fhir/harmonization/standardization/standardize_dob",
        json={"data": test_bundle},
    )

    assert actual_response.json() == expected_response

    expected_response = {
        "status_code": 200,
        "message": None,
        "bundle": copy.deepcopy(test_bundle),
    }
    updated_bundle = copy.deepcopy(test_bundle)
    updated_bundle["entry"][0]["resource"]["birthDate"] = "11/05/1955"

    actual_response = client.post(
        "/fhir/harmonization/standardization/standardize_dob",
        json={"data": updated_bundle, "format": "%m/%d/%Y"},
    )
    assert actual_response.json() == expected_response

    expected_response = {
        "status_code": 200,
        "message": None,
        "bundle": copy.deepcopy(test_bundle),
    }
    updated_bundle = copy.deepcopy(test_bundle)
    updated_bundle["entry"][0]["resource"]["birthDate"] = "11051955"

    actual_response = client.post(
        "/fhir/harmonization/standardization/standardize_dob",
        json={"data": updated_bundle, "format": "%m%d%Y"},
    )
    assert actual_response.json() == expected_response


def test_standardize_dob_failures():
    updated_bundle = copy.deepcopy(test_bundle)
    updated_bundle["entry"][0]["resource"]["birthDate"] = ""
    expected_response = {
        "status_code": 400,
        "message": "Date of Birth must be supplied!",
        "bundle": updated_bundle,
    }

    actual_response = client.post(
        "/fhir/harmonization/standardization/standardize_dob",
        json={"data": updated_bundle},
    )

    assert actual_response.json() == expected_response

    updated_bundle = copy.deepcopy(test_bundle)
    updated_bundle["entry"][0]["resource"]["birthDate"] = "1978-02-30"
    expected_response = {
        "status_code": 400,
        "message": "Invalid date supplied: 1978-02-30",
        "bundle": updated_bundle,
    }

    actual_response = client.post(
        "/fhir/harmonization/standardization/standardize_dob",
        json={"data": updated_bundle},
    )

    assert actual_response.json() == expected_response
