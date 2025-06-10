from app.models import OrchestrationRequest


def build_save_fhir_data_body(
    input_msg: str,
    orchestration_request: OrchestrationRequest,
    workflow_params: dict | None = None,
) -> dict:
    """
    Helper function for constructing the input payload for an API call to
    the DIBBs ecr viewer.

    :param input_msg: The data the user sent for workflow processing, as
      a string.
    :param orchestration_request: The request the client initially sent
      to the orchestration service. This request bundles a number of
      parameter settings into one dictionary that each handler can
      accept for consistency.
    :param workflow_params: Optionally, a set of configuration parameters
      included in the workflow config for the validation step of a workflow.
    :return: A dictionary ready to send to the validation service.
    """
    if workflow_params.get("fhirBundle"):
        fhirBundle = workflow_params["fhirBundle"].json()["extended_bundle"]
    else:
        # If the message from the last step is a FHIR bundle, use it.
        if input_msg.get("resourceType") == "Bundle":
            fhirBundle = input_msg
        # If the message from the last step is not a FHIR bundle, use the orginal message from the request.
        elif orchestration_request.get("message_type") == "fhir":
            fhirBundle = orchestration_request.get("message")
        # If neither the message from the last step nor the original message from the request is a FHIR bundle, raise an error.
        else:
            raise ValueError("Invalid message type for FHIR data.")
    request = {
        "fhirBundle": fhirBundle,
    }
    if workflow_params is not None:
        if workflow_params.get("metadata") is not None:
            request["metadata"] = workflow_params["metadata"].json()["parsed_values"]
        if workflow_params.get("saveSource") is not None:
            request["saveSource"] = workflow_params["saveSource"]
    return request
