import {
  getOrchestrationResponse,
  orchestrationRequest,
} from "@/app/api/orchestration-utils";

const getOrchestrationMessageResponse = async (
  message: string,
  rr_data?: string,
) =>
  await getOrchestrationResponse("process-zip", {
    data_type: "ecr",
    message,
    rr_data,
  });

/**
 * Save the zip via orchestration
 * @param message String wtih eCR data
 * @param rr_data String with RR data
 * @param returnBundle - whether to return the fhir bundle (default false)
 * @returns An object containing the status and message.
 */
export const processMessage = async (
  message: string,
  rr_data?: string,
  returnBundle: boolean = false,
) => {
  return orchestrationRequest(
    getOrchestrationMessageResponse(message, rr_data),
    returnBundle,
  );
};
