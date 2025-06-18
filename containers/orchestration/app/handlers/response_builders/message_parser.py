from requests import Response

from app.handlers.ServiceHandlerResponse import ServiceHandlerResponse


def unpack_parsed_message_response(
    response: Response,
) -> ServiceHandlerResponse:
    """
    Helper function for processing a response from the DIBBs message parser.
    If the status code of the response the server sent back is OK, return
    the parsed JSON message from the response body. Otherwise, report what
    went wrong based on status_code.

    :param response: The response returned by a POST request to the message parser.
    :return: A ServiceHandlerResponse with a dictionary of parsed values
      and instruction to continue, or a failed status code and error messaging.
    """
    status_code = response.status_code
    match status_code:
        case 200:
            return ServiceHandlerResponse(
                status_code, response.json().get("parsed_values"), True
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
                f"Message Parser request failed: {response.text}",
                False,
            )


def unpack_fhir_to_phdc_response(response: Response) -> ServiceHandlerResponse:
    """
    Helper function for processing a response from the DIBBs message parser.
    If the status code of the response the server sent back is OK, return
    the parsed XML message from the response body. Otherwise, report what
    went wrong based on status_code.

    :param response: The response returned by a POST request to the message parser.
    :return: A tuple containing the status code of the response as well as
      parsed message created by the service.
    """
    status_code = response.status_code
    match status_code:
        case 200:
            return ServiceHandlerResponse(status_code, response.content, True)
        case 422:
            return ServiceHandlerResponse(status_code, response.json(), False)
        case _:
            return ServiceHandlerResponse(
                status_code,
                f"Message Parser request failed: {response.text}",
                False,
            )
