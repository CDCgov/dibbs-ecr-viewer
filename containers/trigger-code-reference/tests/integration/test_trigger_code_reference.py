import httpx
import pytest

TCR_URL = "http://0.0.0.0:8080"
STAMP_ENDPOINT = TCR_URL + "/stamp-condition-extensions"


@pytest.fixture
def fhir_bundle(read_json_from_test_assets):
    return read_json_from_test_assets("sample_ecr.json")


@pytest.mark.integration
def test_health_check(setup):
    health_check_response = httpx.get(TCR_URL)
    assert health_check_response.status_code == 200


@pytest.mark.integration
def test_openapi():
    actual_response = httpx.get(TCR_URL + "/trigger-code-reference/openapi.json")
    assert actual_response.status_code == 200


@pytest.mark.integration
def test_tcr_stamping(setup, fhir_bundle):
    reportable_condition_code = "840539006"
    request = {"bundle": fhir_bundle}
    stamp_response = httpx.post(STAMP_ENDPOINT, json=request)
    assert stamp_response.status_code == 200

    # There are four resources that should be stamped:
    #   1. Reportability Response observation
    #   2. Condition
    #   3. DiagnosticReport
    #   4. Lab Observation
    expected_stamped_ids = [
        "17f6392f-9340-45d3-a1c8-bc0a30d09f53",
        "d42c4a1f-f700-61bf-62a0-c034257d6a79",
        "e6aa3537-cb1d-9e2e-9060-08828602339a",
        "ef84511f-a88a-0a84-2353-d44f641673b0",
    ]
    stamped_resources = []
    stamped_bundle = stamp_response.json().get("extended_bundle")
    for entry in stamped_bundle.get("entry", []):
        resource = entry.get("resource")

        # Check whether we stamped this resource for the final comparison
        extensions = resource.get("extension", [])
        for ext in extensions:
            if ext == {
                "url": "https://reportstream.cdc.gov/fhir/StructureDefinition/condition-code",
                "valueCoding": {
                    "code": reportable_condition_code,
                    "system": "http://snomed.info/sct",
                },
            }:
                stamped_resources.append(resource.get("id"))
                break

    # Finally, check that only and exactly the four expected observations
    # were stamped
    assert len(stamped_resources) == len(expected_stamped_ids)
    for rid in stamped_resources:
        assert rid in expected_stamped_ids
