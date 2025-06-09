from app.models import OrchestrationRequest

def build_message_parser_message_request(
    input_msg: str,
    orchestration_request: OrchestrationRequest,
    workflow_params: dict | None = None,
) -> dict:
    """
    Helper function for constructing the output payload for an API call to
    the DIBBs message parser for JSON messages.

    :param input_msg: The data the user sent for workflow processing, as
      a string.
    :param orchestration_request: The request the client initially sent
      to the orchestration service. This request bundles a number of
      parameter settings into one dictionary that each handler can
      accept for consistency.
    :param workflow_params: Optionally, a set of configuration parameters
      included in the workflow config for the converter step of a workflow.
    :return: A dictionary ready to JSON-serialize as a payload to the
      message parser.
    """
    # Template format will depend on the data's structure
    if (
        isinstance(input_msg, dict)
        and input_msg.get("resourceType", "") == "Bundle"
    ):
        msg_fmt = "fhir"
    else:
        msg_fmt = orchestration_request.get("message_type")
    return {
        "message": input_msg,
        "message_format": msg_fmt,
        "parsing_schema_name": workflow_params.get("parsing_schema_name"),
        "credential_manager": workflow_params.get("credential_manager"),
    }


def build_message_parser_phdc_request(
    input_msg: str,
    workflow_params: dict | None = None,
) -> dict:
    """
    Helper function for constructing the output payload for an API call to
    the DIBBs message parser for PHDC-formatted XML.

    :param input_msg: The data the user sent for workflow processing, as
      a string.
    :param orchestration_request: The request the client initially sent
      to the orchestration service. This request bundles a number of
      parameter settings into one dictionary that each handler can
      accept for consistency.
    :param workflow_params: Optionally, a set of configuration parameters
      included in the workflow config for the converter step of a workflow.
    :return: A dictionary ready to JSON-serialize as a payload to the
      message parser.
    """
    return {
        "message": input_msg,
        "phdc_report_type": workflow_params.get("phdc_report_type"),
    }
