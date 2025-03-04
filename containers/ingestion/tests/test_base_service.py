from pathlib import Path

import toml
from app.base_service import DIBBS_CONTACT, LICENSES, BaseService
from fastapi.testclient import TestClient

with open(
    Path(__file__).parent.parent.parent.parent / "pyproject.toml"
) as project_config_file:
    project_config = toml.load(project_config_file)
    default_app_version = project_config["tool"]["poetry"]["version"][1:]


def test_base_service():
    service = BaseService(
        service_name="Test Service",
        service_path="/test-service",
        description_path=Path(__file__).parent / "assets" / "test_description.md",
    )
    assert service.app.title == "Test Service"
    assert service.app.version == default_app_version
    assert service.app.contact == DIBBS_CONTACT
    assert service.app.license_info == LICENSES["CreativeCommonsZero"]
    assert service.app.description == "This is a test description.\n"

    client = TestClient(service.start())

    # Test the health check endpoint
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "OK"}

    # Test the path rewrite middleware
    response = client.get("/test-service")
    assert response.status_code == 200
    assert response.json() == {"status": "OK"}

    # Test the redoc endpoint
    response = client.get("/redoc")
    assert response.status_code == 200


def test_base_service_alternate_license():
    service = BaseService(
        service_name="Test Service",
        service_path="/test-service",
        description_path=Path(__file__).parent / "assets" / "test_description.md",
        license_info="MIT",
    )
    assert service.app.title == "Test Service"
    assert service.app.version == default_app_version
    assert service.app.contact == DIBBS_CONTACT
    assert service.app.license_info == LICENSES["MIT"]
    assert service.app.description == "This is a test description.\n"

    client = TestClient(service.start())
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "OK"}

    response = client.get("/redoc")
    assert response.status_code == 200
