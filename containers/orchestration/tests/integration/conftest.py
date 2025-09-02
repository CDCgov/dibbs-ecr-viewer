import os
import time
from pathlib import Path

import httpx
import pytest
from dotenv import load_dotenv
from testcontainers.compose import DockerCompose


@pytest.fixture(scope="session")
def setup(request):
    print("Setting up tests...")
    path = Path(__file__).resolve().parent.parent.parent
    load_dotenv(dotenv_path=os.path.join(path, ".env"))
    compose_file_name = os.path.join(path, "docker-compose.yaml")
    orchestration_service = DockerCompose(
        path, compose_file_name=compose_file_name, build=True
    )

    orchestration_service.start()

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
        orchestration_service.wait_for(f"http://0.0.0.0:{port}")

    viewer_dependencies_ready = False
    retries = 0
    while not viewer_dependencies_ready and retries < 30:
        time.sleep(1)
        retries += 1

        health_check_response = httpx.get(
            os.getenv("ecr_viewer_url") + "/api/health-check"
        ).json()

        dependencies = health_check_response["dependencies"]
        viewer_dependencies_ready = (
            dependencies.get("azureBlobStorage", "DOWN") == "UP"
            and dependencies.get("metadataDb", "DOWN") == "UP"
        )

    assert viewer_dependencies_ready

    # migrate db
    rs = httpx.post(
        os.getenv("ecr_viewer_url") + "/api/migrate-db",
        data={"migration_secret": "test", "skip_condition_update": "true"},
        headers={
            "Authorization": "Bearer eyJhbGciOiJSUzI1NiIsImlkIjoiYmxhaCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.hXmX6wu9ThiSqNEl6Y3pBETppiIt0j4RKSVPO_AAYZJZsngSFiu8GuGDtA13kJ-texfUHshqcy4euoVwfmN-naDi2Ly6p6lPjY6xzmTuQ1DtiKLZDNBsDupjoLAuIJQ3K8uWRnCdRGG1ZlTkZa-SG8b4jfDLRrl1fPiJCWM62XV7_gIvqCvRAPdP9kMrOV1LtLEuXgoXZGifVNnPQhtT7fQ7kDmbM-HDG4MquZy89CIRy2q22xIclePOAoe0Ifz6q7-NG3I9CzKOAa_Vx6Oy5ZYBYphfV1n46gp4OC0Cb_w-wFLfRDuDPJZvcS5ed2HxdyZrU_GeD4WSN5IQpEn_45CZifBzmv9-jweEUD2or3sp1DReORLZG2CvBqtixC0p3gIeGnY4HROduafmDfyI0gcv7pDM-fcreMCBG-7uqUPkk9rqhCPw9n6fhWvNMSGrtW9tx6hAPNxjKJ2AsyTh7cJyR0teVpijhXZz0dGJOtYY1-nlR7_BnJH2lC9tLiIJcVl1JKfGRu18MV1bHs7y25Wp1HxVDUXllShXa7_oD7ljnE3stmpO5GPMbxvWC_RKO_bu_e2mAgJ3yiPImFpLVYZZgBqClctciZMQeV1lZTAy-7Xlzgdx-IvFc9VuigKw6hfk4on98BxMUENeh20KIgVv8cMr4ZjAGV3MjnFnHWw",
        },
    )
    assert rs.status_code == 200

    print("Orchestration etc. services ready to test!")

    def teardown():
        print("Tests finished! Tearing down.")
        # orchestration_service.stop()

    request.addfinalizer(teardown)
