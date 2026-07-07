import json
import os
from pathlib import Path

import httpx
import pytest

ORCHESTRATION_URL = "http://localhost:8080"
PROCESS_ZIP_ENDPOINT = ORCHESTRATION_URL + "/process-zip"
PROCESS_MESSAGE_ENDPOINT = ORCHESTRATION_URL + "/process-message"


@pytest.mark.integration
def test_health_check(setup):
    """
    Basic test to make sure the orchestration service can communicate with
    other up and running services.
    """
    port_number_strings = [
        "ORCHESTRATION_PORT_NUMBER",
        "FHIR_CONVERTER_PORT_NUMBER",
        "INGESTION_PORT_NUMBER",
        "MESSAGE_PARSER_PORT_NUMBER",
        "ECR_VIEWER_HEALTH_CHECK",
        "TRIGGER_CODE_REFERENCE_PORT_NUMBER",
    ]

    for port_number in port_number_strings:
        port = os.getenv(port_number)
        service_response = httpx.get(f"http://0.0.0.0:{port}")
        print(
            "Health check response for",
            port_number.replace("_PORT_NUMBER", ""),
            ":",
            service_response,
        )
        assert service_response.status_code == 200, (
            f"Expected status code 200, but got {service_response.status_code}. Response content is {service_response.content}"
        )


@pytest.mark.integration
def test_openapi():
    actual_response = httpx.get(ORCHESTRATION_URL + "/orchestration/openapi.json")
    assert actual_response.status_code == 200, (
        f"Expected status code 200, but got {actual_response.status_code}. Response content is {actual_response.content}"
    )


@pytest.mark.integration
def test_process_message_endpoint(setup):
    """
    Tests a basic scenario of accepting an eCR message in XML format and
    applying a full validation through parsing workflow.
    """
    message = open(Path(__file__).parent.parent / "assets" / "CDA_eICR.xml").read()
    request = {
        "message_type": "ecr",
        "data_type": "ecr",
        "config_file_name": "test-no-save.json",
        "message": message,
    }
    orchestration_response = httpx.post(PROCESS_MESSAGE_ENDPOINT, json=request)
    assert orchestration_response.status_code == 200, (
        f"Expected status code 200, but got {orchestration_response.status_code}. Response content is {orchestration_response.content}"
    )
    assert orchestration_response.json()["message"] == "Processing succeeded!"


@pytest.mark.integration
def test_process_zip_endpoint_with_zip(setup):
    """
    Tests full orchestration functionality of an eCR file, but this time,
    the file is zipped rather than raw string.
    """
    with open(
        Path(__file__).parent.parent / "assets" / "test_zip.zip",
        "rb",
    ) as file:
        form_data = {
            "message_type": "ecr",
            "config_file_name": "test-no-save.json",
        }
        files = {"upload_file": ("file.zip", file)}
        orchestration_response = httpx.post(
            PROCESS_ZIP_ENDPOINT, data=form_data, files=files
        )
        assert orchestration_response.status_code == 200, (
            f"Expected status code 200, but got {orchestration_response.status_code}. Response content is {orchestration_response.content}"
        )
        assert orchestration_response.json()["message"] == "Processing succeeded!"


@pytest.mark.integration
def test_process_zip_endpoint_with_zip_and_rr_data(setup):
    """
    Full orchestration test of a zip file containing both an eICR and the
    associated RR data.
    """
    with open(
        Path(__file__).parent.parent / "assets" / "eICR_RR_combo.zip",
        "rb",
    ) as file:
        form_data = {
            "message_type": "ecr",
            "config_file_name": "test-no-save.json",
        }
        files = {"upload_file": ("file.zip", file)}
        orchestration_response = httpx.post(
            PROCESS_ZIP_ENDPOINT, data=form_data, files=files, timeout=60
        )
        assert orchestration_response.status_code == 200, (
            f"Expected status code 200, but got {orchestration_response.status_code}. Response content is {orchestration_response.content}"
        )
        assert orchestration_response.json()["message"] == "Processing succeeded!"
        assert orchestration_response.json()["processed_values"] is not None


@pytest.mark.integration
def test_failed_save_to_ecr_viewer(setup):
    """
    Full orchestration test of a zip file containing both an eICR and the
    associated RR data.
    """
    with open(
        Path(__file__).parent.parent / "assets" / "eICR_RR_combo.zip",
        "rb",
    ) as file:
        form_data = {
            "message_type": "ecr",
            "data_type": "zip",
            "config_file_name": "sample-orchestration-s3-config.json",
        }
        files = {"upload_file": ("file.zip", file)}
        orchestration_response = httpx.post(
            PROCESS_ZIP_ENDPOINT, data=form_data, files=files, timeout=120
        )
        assert orchestration_response.status_code == 500, (
            f"Expected status code 500, but got {orchestration_response.status_code}. Response content is {orchestration_response.content}"
        )


@pytest.mark.integration
def test_success_save_to_ecr_viewer(setup):
    """
    Full orchestration test of a zip file containing both an eICR and the
    associated RR data.
    """
    with open(
        Path(__file__).parent.parent / "assets" / "test_zip.zip",
        "rb",
    ) as file:
        form_data = {
            "message_type": "ecr",
            "data_type": "zip",
            "config_file_name": "integrated.json",
        }
        files = {"upload_file": ("file.zip", file)}
        orchestration_response = httpx.post(
            PROCESS_ZIP_ENDPOINT, data=form_data, files=files, timeout=60
        )

        assert orchestration_response.status_code == 200, (
            f"Expected status code 200, but got {orchestration_response.status_code}. Response content is {orchestration_response.content}"
        )


@pytest.mark.integration
def test_previous_response_mapping_for_ecr_viewer(setup):
    """
    Full orchestration test of a zip file containing both an eICR and the
    associated RR data, using the `previous_response_to_param_mapping` in the config
    """
    with open(
        Path(__file__).parent.parent / "assets" / "test_zip.zip",
        "rb",
    ) as file:
        form_data = {
            "message_type": "ecr",
            "data_type": "zip",
            "config_file_name": "non-integrated-core.json",
        }
        files = {"upload_file": ("file.zip", file)}
        orchestration_response = httpx.post(
            PROCESS_ZIP_ENDPOINT, data=form_data, files=files, timeout=60
        )

        assert orchestration_response.status_code == 200, (
            f"Expected status code 200, but got {orchestration_response.status_code}. Response content is {orchestration_response.content}"
        )


@pytest.mark.integration
def test_process_message_fhir(setup):
    """
    Integration test of a different workflow and data type, a FHIR bundle
    passed through standardization.
    """
    message = json.load(open(Path(__file__).parent.parent / "assets" / "bundle.json"))
    request = {
        "message_type": "fhir",
        "data_type": "fhir",
        "config_file_name": "sample-fhir-test-config.json",
        "message": message,
    }
    orchestration_response = httpx.post(PROCESS_MESSAGE_ENDPOINT, json=request)
    assert orchestration_response.status_code == 200, (
        f"Expected status code 200, but got {orchestration_response.status_code}. Response content is {orchestration_response.content}"
    )
    assert orchestration_response.json()["message"] == "Processing succeeded!"
