import { Bundle } from "fhir/r4";

import {
  saveFhirData,
  saveWithMetadata,
} from "@/app/api/save-fhir-data/service";
import {
  BundleExtendedMetadata,
  BundleMetadata,
} from "@/app/api/save-fhir-data/types";
import { dbDialect, dbSchema } from "@/app/data/metadataDb/utils/db-config";

interface OrchestrationRawResponse {
  message: string;
  processed_values: {
    responses: [
      { stamped_ecr: { extended_bundle: Bundle } },
      {
        metadata_values: {
          parsed_values: BundleExtendedMetadata | BundleMetadata;
        };
      }?,
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
  if (!!dbDialect()) {
    if (dbSchema() === "extended") {
      return "bundle-metadata-extended.json";
    } else {
      return "bundle-metadata-core.json";
    }
  } else {
    return "bundle-only.json";
  }
};

export type ProcessedEntry = [
  Record<string, string | File | undefined>,
  string,
  string,
];

/**
 * Make a request to orchestration /process-zip endpoint
 * @param getEndpoint - Given the body, get the endpoind and data type
 * @param rawBodyEntries - endpoint-specific entries to add to the body
 * @returns orchestration response
 */
export const getOrchestrationResponse = async <
  T extends Record<string, string | Blob | undefined>,
>(
  getEndpoint: (bodyEntries: T) => Promise<ProcessedEntry>,
  rawBodyEntries: T,
): Promise<BundleInfo> => {
  const [bodyEntries, endpoint, data_type] = await getEndpoint(rawBodyEntries);
  const bodyObj = {
    message_type: "ecr",
    include_error_types: "[errors]",
    config_file_name: getOrchestrationConfigName(),
    data_type,
    ...bodyEntries,
  };

  let body: string | FormData;
  const headers = new Headers();
  if (endpoint === "process-zip") {
    const formData = new FormData();
    for (const [k, v] of Object.entries(bodyObj)) {
      !!v && formData.append(k, v);
    }
    body = formData;
  } else {
    body = JSON.stringify(bodyObj);
    headers.append("content-type", "application/json");
  }

  const response = await fetch(`${process.env.ORCHESTRATION_URL}/${endpoint}`, {
    method: "post",
    body,
    headers,
  });

  if (response.status !== 200) {
    console.error(await response.text());
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
 * @param getResponse - Promise that resolves to an orchestration response
 * @param returnBundle - whether to return the fhir bundle (default false)
 * @returns An object containing the status and message.
 */
export const orchestrationRequest = async (
  getResponse: Promise<BundleInfo>,
  returnBundle: boolean = false,
) => {
  let orchestrationResp: BundleInfo;
  try {
    orchestrationResp = await getResponse;
  } catch (error: unknown) {
    const message = "Failed to process orchestration response";
    console.error({ message, error });
    return {
      message,
      status: 500,
    };
  }
  const res = await saveToSource(
    orchestrationResp.ecr,
    orchestrationResp.metadata,
  );

  if (returnBundle) {
    return { ...res, bundle: orchestrationResp.ecr };
  } else {
    return res;
  }
};
