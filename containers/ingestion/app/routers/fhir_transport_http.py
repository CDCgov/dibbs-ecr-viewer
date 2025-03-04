from typing import Literal

from fastapi import APIRouter, Response, status
from pydantic import BaseModel, Field, field_validator

from app.fhir.transport import upload_bundle_to_fhir_server
from app.utils import (
    StandardResponse,
    check_for_fhir_bundle,
    get_cred_manager,
    search_for_required_values,
)

router = APIRouter(
    prefix="/fhir/transport/http",
    tags=["fhir/transport"],
)


class UploadBundleToFhirServerInput(BaseModel):
    bundle: dict = Field(
        description="A FHIR bundle (type 'batch' or 'transaction') to post.  Each entry"
        " in the bundle must contain a `request` element in addition to a `resource`. "
        "The FHIR API provides additional details on creating [FHIR-conformant "
        "batch/transaction](https://hl7.org/fhir/http.html#transaction) bundles."
    )
    cred_manager: Literal["azure", "gcp"] | None = Field(
        default=None,
        description="The credential manager used to authenticate to the FHIR server.",
    )
    fhir_url: str | None = Field(
        default=None, description="The url of the FHIR server to upload to."
    )

    _check_for_fhir_bundle = field_validator("bundle")(check_for_fhir_bundle)


@router.post("/upload_bundle_to_fhir_server", status_code=200)
def upload_bundle_to_fhir_server_endpoint(
    input: UploadBundleToFhirServerInput, response: Response
) -> StandardResponse:
    """
    This endpoint uploads all of the resources in a FHIR bundle to a FHIR server.

    ### Inputs and Outputs
    - :param input: A JSON formated request body with schema specified by the
        UploadBundleToFhirServerInput model.
    - :return: A dictionary containing the status code and body of the response received
        from the FHIR server.
    """
    input = dict(input)
    required_values = ["cred_manager", "fhir_url"]
    search_result = search_for_required_values(input, required_values)
    if search_result != "All values were found.":
        response.status_code = status.HTTP_400_BAD_REQUEST
        return {"status_code": 400, "message": search_result}

    input["cred_manager"] = get_cred_manager(
        cred_manager=input["cred_manager"], location_url=input["fhir_url"]
    )

    fhir_server_responses = upload_bundle_to_fhir_server(**input)
    full_fhir_server_response_body = {
        "resourceType": "Bundle",
        "type": "transaction-response",
        "entry": [],
    }
    full_response_status = "200"
    status_codes = []

    # getting a list of responses back, loop through them and
    #  process them accordinly and return a composite response
    for fhir_server_response in fhir_server_responses:
        fhir_server_response_body = fhir_server_response.json()
        status_codes.append(fhir_server_response.status_code)

        # If the FHIR store responds with a 200 check if
        # any individual resources failed to upload.
        failed_resources = []
        if fhir_server_response.status_code == 200:
            failed_resources = [
                entry
                for entry in fhir_server_response_body["entry"]
                if entry["response"]["status"]
                not in ["200 OK", "201 Created", "200", "201"]
            ]

            if failed_resources != []:
                fhir_server_response.status_code = 400
                full_fhir_server_response_body["entry"].extend(
                    failed_resources[0 : len(failed_resources)]
                )

        if fhir_server_response.status_code != 200:
            response.status_code = status.HTTP_400_BAD_REQUEST
            full_response_status = "400"

    return {
        "status_code": full_response_status,
        "message": {
            "fhir_server_response": {
                "fhir_server_status_code": status_codes,
                "fhir_server_response_body": full_fhir_server_response_body,
            }
        },
    }
