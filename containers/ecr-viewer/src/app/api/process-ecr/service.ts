import { Bundle } from "fhir/r4";
import { fetch, Agent, FormData } from "undici";

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

interface RequestBody {
  ecr: File | string;
  rr?: File | string;
}

const asString = async (v: string | File | undefined) =>
  v instanceof File ? await v.text() : v;

/**
 * Make a request to orchestration /process-zip endpoint
 * @param rawBodyEntries - raw body entries
 * @param rawBodyEntries.ecr - ecr data
 * @param rawBodyEntries.rr - rr data
 * @param fetchAgent - the Undici agent that dispatches the request
 * @returns orchestration response
 */
export const getOrchestrationResponse = async (
  { ecr, rr }: RequestBody,
  fetchAgent: Agent,
): Promise<BundleInfo> => {
  const bodyObj: Record<string, string | File | undefined> = {
    message_type: "ecr",
    include_error_types: "[errors]",
    config_file_name: getOrchestrationConfigName(),
  };
  let endpoint = "process-message";
  if (ecr instanceof File && ecr.type === "application/zip") {
    endpoint = "process-zip";
    bodyObj.data_type = "zip";
    bodyObj.upload_file = ecr;
  } else {
    bodyObj.data_type = "ecr";
    bodyObj.message = await asString(ecr);
    bodyObj.rr_data = await asString(rr);
  }

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
    // 1 hour timeout should allow any eCR to process
    dispatcher: fetchAgent,
  });

  if (response.status !== 200) {
    const message = "Error thrown from orchestration";
    console.error({
      message,
      status: response.status,
      body: await response.text(),
    });
    throw new Error(message);
  } else {
    const resp = (await response.json()) as OrchestrationRawResponse;
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
  const ecrId = bundle.id!;
  if (metadata) {
    return saveWithMetadata(bundle, ecrId, process.env.SOURCE, metadata);
  } else {
    return saveFhirData(bundle, ecrId, process.env.SOURCE);
  }
};

/**
 * Save the zip via orchestration
 * @param body - Parsed body of the request
 * @param returnBundle - whether to return the fhir bundle (default false)
 * @param fetchAgent - the Undici agent that dispatches the request
 * @returns An object containing the status and message.
 */
export const orchestrationRequest = async (
  body: RequestBody,
  returnBundle: boolean = false,
  fetchAgent = new Agent({ headersTimeout: 3600000 }),
) => {
  let orchestrationResp: BundleInfo;
  try {
    orchestrationResp = await getOrchestrationResponse(body, fetchAgent);
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
