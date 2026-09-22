import asyncio
import json
import os
from pathlib import Path

import httpx2
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_list_loaded_configs():
    response = client.get("/configs")
    default_configs = os.listdir(
        Path(__file__).parent.parent / "app" / "default_configs"
    )
    assert response.status_code == 200
    assert response.json()["default_configs"] == default_configs


def test_get_specific_config():
    test_config_path = (
        Path(__file__).parent.parent / "app" / "default_configs" / "test-config.json"
    )
    with open(test_config_path) as file:
        test_config = json.load(file)

    response = client.get("/configs/test-config.json")
    assert response.status_code == 200
    assert response.json() == {
        "message": "Config found!",
        "workflow": test_config,
    }


def test_core_metadata_config_uses_core_parsing_schema():
    config_path = (
        Path(__file__).parent.parent
        / "app"
        / "default_configs"
        / "bundle-metadata-core.json"
    )
    with open(config_path) as file:
        config = json.load(file)

    parser_step = next(
        step for step in config["workflow"] if step["service"] == "message_parser"
    )

    assert parser_step["params"]["parsing_schema_name"] == "core.json"


def test_config_not_found():
    response = client.get("/configs/some-config-that-does-not-exist.json")
    assert response.status_code == 400
    assert response.json() == {
        "message": "A config with the name 'some-config-that-does-not-exist.json' "
        + "could not be found.",
        "workflow": {},
    }


def test_upload_config_rejects_invalid_filename():
    async def send_request():
        transport = httpx2.ASGITransport(app=app)
        async with httpx2.AsyncClient(
            transport=transport, base_url="http://test"
        ) as async_client:
            return await async_client.put(
                "/configs/subdir%5Cconfig.json",
                json={"workflow": {"workflow": []}},
            )

    response = asyncio.run(send_request())

    assert response.status_code == 400
    assert response.json() == {
        "message": (
            "File name must identify a file directly within the configured directory."
        )
    }


def test_upload_config_good():
    request_body = {
        "workflow": {
            "workflow": [
                {
                    "service": "ingestion",
                    "url": "some-url-for-an-ingestion-service",
                    "endpoint": "/fhir/harmonization/standardization/standardize_names",
                }
            ]
        }
    }
    test_config_name = "test_config1.json"

    # Upload a new config.
    response = client.put(
        f"/configs/{test_config_name}",
        json=request_body,
    )
    assert response.status_code == 201
    assert response.json() == {"message": "Config uploaded successfully!"}


def test_upload_config_already_exists():
    request_body = {
        "workflow": {
            "workflow": [
                {
                    "service": "ingestion",
                    "url": "some-url-for-an-ingestion-service",
                    "endpoint": "/fhir/harmonization/standardization/standardize_names",
                }
            ]
        }
    }
    test_config_name = "test_config1.json"

    # Upload a new config.
    response = client.put(
        f"/configs/{test_config_name}",
        json=request_body,
    )

    # Attempt to upload a config with name that already exists.
    response = client.put(
        "/configs/test_config1.json",
        json=request_body,
    )
    assert response.status_code == 400
    assert response.json() == {
        "message": f"A config for the name '{test_config_name}' already exists. "
        "To proceed submit a new request with a different config name or set the "
        "'overwrite' field to 'true'."
    }

    # Upload a config with name that already exists and overwrite it.
    request_body["overwrite"] = True
    response = client.put(
        "/configs/test_config1.json",
        json=request_body,
    )
    assert response.status_code == 200
    assert response.json() == {"message": "Config updated successfully!"}

    # Delete the test config to avoid conflicts with other tests.
    processing_config = (
        Path(__file__).parent.parent / "app" / "custom_configs" / test_config_name
    )
    processing_config.unlink()
