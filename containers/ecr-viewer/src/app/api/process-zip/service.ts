import {
  getOrchestrationResponse,
  orchestrationRequest,
} from "@/app/api/orchestration-utils";

const getOrchestrationZipResponse = async (file: File) =>
  await getOrchestrationResponse("process-zip", {
    data_type: "zip",
    upload_file: file,
  });

/**
 * Save the zip via orchestration
 * @param file - the file to send to orchestration
 * @param returnBundle - whether to return the fhir bundle (default false)
 * @returns An object containing the status and message.
 */
export const processZip = async (file: File, returnBundle: boolean = false) => {
  return orchestrationRequest(getOrchestrationZipResponse(file), returnBundle);
};
