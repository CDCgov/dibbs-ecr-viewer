from httpx import Response

from app.handlers.ServiceHandlerResponse import ServiceHandlerResponse


def unpack_stamp_condition_extensions_response(
    response: Response,
) -> ServiceHandlerResponse:
    """
    Helper function for processing a response from trigger code reference service's stamp conditions extension endpoint.

    If the status code of the response the server sent back is OK, return
    the message from the response body. Otherwise, report what
    went wrong based on status_code.

    :param response: The response returned by a POST request to the ingestion service.
    :return: A tuple containing the status code of the response as well as
      parsed message created by the service.
    """
    status_code = response.status_code

    match status_code:
        case 200:
            return ServiceHandlerResponse(
                status_code,
                response.json().get("extended_bundle"),
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
                f"Stamping condition extensions failed: {response.text}",
                False,
            )
