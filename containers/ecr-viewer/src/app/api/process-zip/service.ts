import { Bundle } from "fhir/r4";
import {
  saveFhirData,
  saveWithMetadata,
} from "../save-fhir-data/save-fhir-data-service";
import {
  BundleExtendedMetadata,
  BundleMetadata,
} from "../save-fhir-data/types";

interface OrchestrationRawResponse {
  message: string;
  processed_values: {
    responses: [
      { stamped_ecr: { extended_bundle: Bundle } },
      { metadata_values: BundleExtendedMetadata | BundleMetadata }?,
    ];
  };
}

interface BundleInfo {
  ecr: Bundle;
  metadata: BundleMetadata | BundleExtendedMetadata | undefined;
}

/**
 * Determines the orchestration config to use based on set env variables
 * @returns name of the orchestration config
 */
const getOrchestrationConfigName = () => {
  if (process.env.NON_INTEGRATED_VIEWER === "true") {
    if (process.env.METADATA_DATABASE_SCHEMA === "extended") {
      return "bundle-metadata-extended.json";
    } else {
      return "bundle-metadata-core.json";
    }
  } else {
    return "bundle-only.json";
  }
};

/**
 * Make a request to orchestration /process-zip endpoint
 * @param file - the file to send to orchestration
 * @returns orchestration response
 */
const getOrchestrationResponse = async (file: File): Promise<BundleInfo> => {
  const formData = new FormData();
  formData.append("message_type", "ecr");
  formData.append("include_error_types", "[errors]");
  formData.append("config_file_name", getOrchestrationConfigName());
  formData.append("data_type", "zip");
  formData.append("upload_file", file);

  const response = await fetch(`${process.env.ORCHESTRATION_URL}/process-zip`, {
    method: "post",
    body: formData,
  });

  if (response.status !== 200) {
    console.error(await response.json());
    throw "Error thrown from orchestration";
  } else {
    const resp: OrchestrationRawResponse = await response.json();
    return {
      ecr: resp.processed_values.responses[0].stamped_ecr.extended_bundle,
      metadata: resp.processed_values.responses?.[1]?.metadata_values,
    };
  }
};

/**
 * Save the bundle and metadata based on env variables
 * @param bundle - the fhir bundle to save
 * @param metadata - the related metadata to save
 * @returns the status and message from saving
 */
const saveToSource = (
  bundle: Bundle,
  metadata: BundleMetadata | BundleExtendedMetadata | undefined,
) => {
  const ecrId = bundle.entry?.[0].resource?.id as string;
  if (metadata) {
    return saveWithMetadata(bundle, ecrId, process.env.SOURCE, metadata);
  } else {
    return saveFhirData(bundle, ecrId, process.env.SOURCE);
  }
};

/**
 * Save the zip via orchestration
 * @param file - the file to send to orchestration
 * @returns An object containing the status and message.
 */
export const processZip = async (file: File) => {
  let orchestrationResp: BundleInfo;
  try {
    orchestrationResp = await getOrchestrationResponse(file);
  } catch (error: any) {
    const message = "Failed to process orchestration response";
    console.error({ message, error });
    return {
      message,
      status: 500,
    };
  }
  return await saveToSource(orchestrationResp.ecr, orchestrationResp.metadata);
};
