/**
 * Make a request to orchestration /process-zip endpoint
 * @param file - the file to send to orchestration
 * @returns orchestration response
 */
const getOrchestrationResponse = async (): Promise<BundleInfo> => {
  const formData = new FormData();
  formData.append("include_error_types", "[errors]");
  formData.append("config_file_name", "list-conditions-config.json");

  const response = await fetch(
    `${process.env.ORCHESTRATION_URL}/process-message`,
    {
      method: "post",
      body: formData,
    },
  );

  if (response.status !== 200) {
    console.error(await response.json());
    throw "Error thrown from orchestration";
  } else {
    const resp: OrchestrationRawResponse = await response.json();
    return {
      ecr: resp.processed_values.responses[0].stamped_ecr.extended_bundle,
      metadata:
        resp.processed_values.responses?.[1]?.metadata_values.parsed_values,
    };
  }
};
