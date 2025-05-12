import { Bundle, FhirResource } from "fhir/r4";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { dbDialect, dbSchema } from "@/app/data/metadataDb/utils/db-config";

import { saveFhirData, saveWithMetadata } from "./save-fhir-data/service";
import { BundleExtendedMetadata, BundleMetadata } from "./save-fhir-data/types";

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

export interface BundleInfo {
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

/**
 * Make a request to orchestration /process-zip endpoint
 * @param endpoint - orchestration end point to use for data processing
 * @param formEntries - endpoint-specific form entries to add to the body
 * @returns orchestration response
 */
export const getOrchestrationResponse = async (
  endpoint: string,
  formEntries: Record<string, string | Blob | undefined>,
): Promise<BundleInfo> => {
  const formData = new FormData();
  formData.append("message_type", "ecr");
  formData.append("include_error_types", "[errors]");
  formData.append("config_file_name", getOrchestrationConfigName());
  for (const [k, v] of Object.entries(formEntries)) {
    !!v && formData.append(k, v);
  }

  const response = await fetch(`${process.env.ORCHESTRATION_URL}/${endpoint}`, {
    method: "post",
    body: formData,
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
export const saveToSource = (
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

/**
 * @param processBody Async function that takes a form and returns orchestration data
 * @returns POST handler for an orchestration processing route
 */
export const postOrchestration =
  (
    processBody: (
      formData: FormData,
    ) => Promise<ProcessOrchestrationResponse & { status: number }>,
  ) =>
  async (
    request: NextRequest,
  ): Promise<NextResponse<ProcessOrchestrationResponse>> => {
    // Parse out the form from the request
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { message: "Validation error", errors: ["No form found"] },
        { status: 400 },
      );
    }

    try {
      const { status, ...payload } = await processBody(formData);
      return NextResponse.json(payload, { status });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            message: "Validation error",
            errors: error.errors,
          },
          { status: 400 },
        );
      }

      console.error(error);
      return NextResponse.json(
        { message: "Internal Server Error" },
        { status: 500 },
      );
    }
  };

export interface ProcessOrchestrationResponse {
  message: string;
  erorors?: string[];
  bundle?: Bundle<FhirResource>;
}
