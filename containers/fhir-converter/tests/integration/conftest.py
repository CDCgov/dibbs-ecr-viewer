import os

import pytest
from testcontainers.compose import DockerCompose


@pytest.fixture(scope="session")
def setup(request):
    print("Setting up tests...")
    compose_path = os.path.join(os.path.dirname(__file__), "../..")
    compose_file_name = "docker-compose.yaml"
    fhir_converter = DockerCompose(
        compose_path,
        compose_file_name=compose_file_name,
        build=True,
    )
    converter_url = "http://localhost:8080"

    fhir_converter.start()
    print("Starting FHIR Converter...")
    fhir_converter.wait_for(converter_url)
    print("FHIR Converter ready to test!")

    def teardown():
        print("Service logs...\n")
        stdout, stderr = fhir_converter.get_logs()
        print(stdout)
        print(stderr)
        print("Tests finished! Tearing down.")
        fhir_converter.stop()

    request.addfinalizer(teardown)
