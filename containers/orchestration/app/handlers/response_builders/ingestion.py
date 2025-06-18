from requests import Response

from app.handlers.ServiceHandlerResponse import ServiceHandlerResponse


def unpack_validation_response(response: Response) -> ServiceHandlerResponse:
    """
    Helper function for processing a response from the DIBBs validation
    service. If the message is valid, with no errors in data structure,
    just report that to the calling orchestrator so we can continue the
    workflow. If the message isn't valid but the service succeeded (status
    code 200), tell the caller what the errors were so they can abort
    and inform the user.

    :param response: The response returned by a POST request to the validation
      service.
    :return: A ServiceHandlerResponse with any validation errors the data
      generated, or an instruction to continue to the next service.
    """
    match response.status_code:
        case 200:
            validator_response = response.json()
            return ServiceHandlerResponse(
                response.status_code,
                validator_response.get("validation_results"),
                validator_response.get("message_valid"),
            )
        case _:
            return ServiceHandlerResponse(
                response.status_code,
                f"Validation service failed: {response.text}",
                False,
            )


def unpack_ingestion_standardization(response: Response) -> ServiceHandlerResponse:
    """
    Helper function for processing a response from the ingestion standardization
    services.
    If the status code of the response the server sent back is OK, return
    the parsed json message from the response body. Otherwise, report what
    went wrong based on status_code. Usable for DOB, name, and phone standardization,
    and geocoding.

    :param response: The response returned by a POST request to the ingestion service.
    :return: A tuple containing the status code of the response as well as
      parsed message created by the service.
    """
    status_code = response.status_code

    match status_code:
        case 200:
            return ServiceHandlerResponse(
                status_code,
                response.json().get("bundle"),
                True,
            )
        case 400:
            return ServiceHandlerResponse(
                status_code, response.json().get("message"), False
            )
        case 422:
            return ServiceHandlerResponse(status_code, response.json(), False)
        case _:
            return ServiceHandlerResponse(
                status_code,
                f"Standardization request failed: {response.text}",
                False,
            )
