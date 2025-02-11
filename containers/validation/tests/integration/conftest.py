import os
from pathlib import Path

import pytest
from testcontainers.compose import DockerCompose


@pytest.fixture(scope="session")
def read_file_from_test_assets():
    def _read_file(filename: str) -> str:
        """
        Reads a file from the test assets directory.
        """
        with open(
            (Path(__file__).parent.parent / "assets" / filename), encoding="utf-8"
        ) as file:
            return file.read()

    return _read_file


@pytest.fixture(scope="session")
def setup(request):
    print("Setting up tests...")
    compose_path = os.path.join(os.path.dirname(__file__), "./")
    compose_file_name = "docker-compose.yaml"
    validation_service = DockerCompose(
        compose_path, compose_file_name=compose_file_name
    )
    converter_url = "http://0.0.0.0:8080"

    validation_service.start()
    validation_service.wait_for(converter_url)
    print("Validation service ready to test!")

    def teardown():
        print("\nContainer output: ")
        print(validation_service.get_logs())
        print("Tests finished! Tearing down.")
        validation_service.stop()

    request.addfinalizer(teardown)
