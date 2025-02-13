from pathlib import Path

from app.base_service import BaseService
from app.config import get_settings
from app.routers import (
    cloud_storage,
    fhir_geospatial,
    fhir_harmonization_standardization,
    fhir_linkage_link,
    fhir_transport_http,
)

# Read settings immediately to fail fast in case there are invalid values.
get_settings()

# Instantiate FastAPI via DIBBs' BaseService class
app = BaseService(
    service_name="DIBBs Ingestion Service",
    service_path="/ingestion",
    description_path=Path(__file__).parent.parent / "description.md",
    openapi_url="/ingestion/openapi.json",
).start()

app.include_router(fhir_harmonization_standardization.router)
app.include_router(fhir_geospatial.router)
app.include_router(fhir_linkage_link.router)
app.include_router(fhir_transport_http.router)
app.include_router(cloud_storage.router)
