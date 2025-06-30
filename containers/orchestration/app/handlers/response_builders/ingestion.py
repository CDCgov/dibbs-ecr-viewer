from httpx import Response

from app.handlers.ServiceHandlerResponse import ServiceHandlerResponse


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
