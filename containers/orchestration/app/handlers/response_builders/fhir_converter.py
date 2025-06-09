from requests import Response

from app.handlers.ServiceHandlerResponse import ServiceHandlerResponse

def unpack_fhir_converter_response(response: Response) -> ServiceHandlerResponse:
    """
    Helper function for processing a response from the DIBBs FHIR converter.
    If the status code of the response the server sent back is OK, return
    the parsed FHIR bundle from the response body. Otherwise, report what
    went wrong.

    :param response: The response returned by a POST request to the FHIR
      converter.
    :return: A ServiceHandlerResponse with a FHIR bundle and instruction
      to continue, or a failed status code and error messaging.
    """
    match response.status_code:
        case 200:
            converter_response = response.json().get("response")
            fhir_msg = converter_response.get("FhirResource")
            return ServiceHandlerResponse(response.status_code, fhir_msg, True)
        case _:
            return ServiceHandlerResponse(
                response.status_code,
                f"FHIR Converter request failed: {response.text}",
                False,
            )
