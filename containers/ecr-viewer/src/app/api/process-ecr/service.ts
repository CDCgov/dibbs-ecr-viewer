import JSZip from "jszip";
import { SaxesParser, type SaxesAttributeNS } from "saxes";
import { fetch, Agent, FormData } from "undici";

import {
  BundleExtendedMetadata,
  BundleMetadata,
  deleteFromStorage,
  saveToStorage,
  saveWithMetadata,
} from "@/app/services/saveFhirDataService";
import { getDb } from "@/app/data/metadataDb/database";
import { Core } from "@/app/data/metadataDb/types/core";
import { dbDialect, dbSchema } from "@/app/data/metadataDb/utils/db-config";
import { getEcrIdFromIdentifier, resolveEcrId } from "@/app/utils/ecrid-utils";
import { Bundle } from "@/app/types";

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
  messageInTimestamp: string;
  messageOutTimestamp: string;
}

/**
 * Thrown when the orchestration request fails — either orchestration itself
 * responded with an error, or we never got a response at all (timeout,
 * connection drop, etc). Carries message-in/out timestamps (whenever we
 * started and gave up on the request) so a failed or slow request is still
 * traceable.
 */
export class OrchestrationError extends Error {
  messageInTimestamp: string;
  messageOutTimestamp: string;

  constructor(
    message: string,
    messageInTimestamp: string,
    messageOutTimestamp: string,
  ) {
    super(message);
    this.name = "OrchestrationError";
    this.messageInTimestamp = messageInTimestamp;
    this.messageOutTimestamp = messageOutTimestamp;
  }
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

const isZipFile = (file: File) =>
  file.type === "application/zip" || file.type === "application/octet-stream";

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
  // These values select the eCR workflow. The converter, not the viewer,
  // determines whether the XML payload is C-CDA or FHIR from its root element.
  const bodyObj: Record<string, string | File | undefined> = {
    message_type: "ecr",
    include_error_types: "[errors]",
    config_file_name: getOrchestrationConfigName(),
  };
  let endpoint = "process-message";
  if (ecr instanceof File && isZipFile(ecr)) {
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

  // Grab this before firing off the request — if it times out or the
  // connection just dies, we still want a message-in time to report.
  const messageInTimestamp = new Date().toISOString();

  let response: Awaited<ReturnType<typeof fetch>>;
  try {
    response = await fetch(`${process.env.ORCHESTRATION_URL}/${endpoint}`, {
      method: "post",
      body,
      headers,
      dispatcher: fetchAgent,
    });
  } catch (error) {
    const messageOutTimestamp = new Date().toISOString();
    console.error({
      message: "Error thrown from orchestration",
      error,
    });
    throw new OrchestrationError(
      error instanceof Error ? error.message : "Failed to reach orchestration",
      messageInTimestamp,
      messageOutTimestamp,
    );
  }

  if (response.status !== 200) {
    const messageOutTimestamp = new Date().toISOString();
    let message = "";
    const text = await response.text();

    console.error({
      message: "Error thrown from orchestration",
      status: response.status,
      body: text,
    });

    try {
      const json = JSON.parse(text);
      // "message" is orchestration's own error text. "detail" shows up
      // instead when the API failed validation before it ever reaches
      // orchestration's own error handling.
      message = json?.message || json?.detail || text;
    } catch {
      message = text;
    }

    throw new OrchestrationError(
      message,
      messageInTimestamp,
      messageOutTimestamp,
    );
  } else {
    const resp = (await response.json()) as OrchestrationRawResponse;
    const messageOutTimestamp = new Date().toISOString();
    return {
      ecr: resp.processed_values.responses[0].stamped_ecr.extended_bundle,
      metadata:
        resp.processed_values.responses?.[1]?.metadata_values.parsed_values,
      messageInTimestamp,
      messageOutTimestamp,
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
  const identifier = bundle.identifier;

  if (identifier) {
    const ecrId = getEcrIdFromIdentifier(identifier);
    if (metadata) {
      return saveWithMetadata(bundle, ecrId, process.env.SOURCE, metadata);
    } else {
      return saveToStorage(bundle, ecrId, process.env.SOURCE, "fhir");
    }
  } else {
    throw new Error("eCR bundle contains no identifier.");
  }
};

/**
 * Set up the orchestration request fetch agent and timeout
 * @returns a fetch agent with configured timeout from env var or defaults to 15 minutes
 */
export const createOrchestrationAgent = () => {
  return new Agent({
    headersTimeout: process.env.ECR_PROCESSING_TIMEOUT
      ? Number(process.env.ECR_PROCESSING_TIMEOUT)
      : 900_000,
  });
};

/**
 * Process and save an eCR through orchestration
 * @param body - Parsed body of the request
 * @param returnBundle - whether to return the fhir bundle (default false)
 * @param fetchAgent - the Undici agent that dispatches the request
 * @param shouldSaveXml - whether to archive the original XML input
 * @returns An object containing the status and message.
 */
export const orchestrationRequest = async (
  body: RequestBody,
  returnBundle: boolean = false,
  fetchAgent = createOrchestrationAgent(),
  shouldSaveXml: boolean = false,
) => {
  // Read only the source identifier before invoking orchestration so a known
  // eCR can be rejected without paying the cost of C-CDA/FHIR conversion.
  const inputEcrId = await getEcrIdFromXml(body);

  if (dbDialect()) {
    const existing = await getDb<Core>()
      .selectFrom("ecr_data")
      .select((eb) => eb.fn.countAll().as("num_ecr"))
      .where("ecr_data.eicr_id", "=", inputEcrId)
      .executeTakeFirst();
    if (existing && Number(existing.num_ecr) > 0) {
      return { message: `eCR already loaded: ${inputEcrId}`, status: 409 };
    }
  }

  const promises: [
    Promise<{
      message: string;
      status: number;
      bundle?: Bundle;
      message_in_timestamp?: string;
      message_out_timestamp?: string;
    }>,
    Promise<{ message: string; status: number }>?,
  ] = [
    (async () => {
      let orchestrationResp: BundleInfo;
      try {
        orchestrationResp = await getOrchestrationResponse(body, fetchAgent);
      } catch (error: unknown) {
        const message = "Failed to process orchestration response";
        console.error({ message, error });
        return {
          message:
            error instanceof Error && error.message ? error.message : message,
          status: 500,
          ...(error instanceof OrchestrationError
            ? {
                message_in_timestamp: error.messageInTimestamp,
                message_out_timestamp: error.messageOutTimestamp,
              }
            : {}),
        };
      }

      const res = await saveToSource(
        orchestrationResp.ecr,
        orchestrationResp.metadata,
      );
      const timestamps = {
        message_in_timestamp: orchestrationResp.messageInTimestamp,
        message_out_timestamp: orchestrationResp.messageOutTimestamp,
      };
      if (returnBundle) {
        return { ...res, ...timestamps, bundle: orchestrationResp.ecr };
      }
      return { ...res, ...timestamps };
    })(),
  ];

  if (shouldSaveXml) {
    promises.push(zipAndSaveXml(body, inputEcrId));
  }

  const [orchestrationResult, xmlSaveResult] =
    await Promise.allSettled(promises);

  if (
    orchestrationResult.status === "rejected" ||
    orchestrationResult.value.status >= 500
  ) {
    if (
      shouldSaveXml &&
      xmlSaveResult?.status === "fulfilled" &&
      xmlSaveResult.value?.status === 200
    ) {
      await deleteFromStorage(inputEcrId, process.env.SOURCE, "xml");
    }

    if (orchestrationResult.status === "rejected") {
      return { message: String(orchestrationResult.reason), status: 500 };
    }

    const { message, message_in_timestamp, message_out_timestamp } =
      orchestrationResult.value;
    return {
      message,
      message_in_timestamp,
      message_out_timestamp,
      status: 500,
    };
  }

  return orchestrationResult.value;
};

/**
 * Extract the source eCR identifier without performing a full conversion.
 * C-CDA uses ClinicalDocument/id attributes; FHIR XML uses the direct
 * Bundle/identifier system and value primitive attributes.
 * @param body - Parsed body of the request
 * @returns The eCR ID as a string
 */
export const getEcrIdFromXml = async (body: RequestBody): Promise<string> => {
  let xmlString: string;

  if (typeof body.ecr === "string") {
    xmlString = body.ecr;
  } else if (body.ecr instanceof File && isZipFile(body.ecr)) {
    xmlString = await unzipXml(body.ecr);
  } else if (
    body.ecr instanceof File &&
    (body.ecr.type === "application/xml" ||
      body.ecr.type === "text/xml" ||
      body.ecr.type.endsWith("+xml"))
  ) {
    xmlString = await body.ecr.text();
  } else {
    throw new Error(
      "Unsupported upload type. eCRs must be an XML string, XML file, or zipped XML file",
    );
  }

  class FoundEcrId extends Error {
    constructor(readonly ecrId: string) {
      super();
    }
  }

  const CDA_NAMESPACE = "urn:hl7-org:v3";
  const FHIR_NAMESPACE = "http://hl7.org/fhir";
  const parser = new SaxesParser({ xmlns: true });
  const stack: Array<{ local: string; uri: string }> = [];
  let documentType: "ccda" | "fhir" | undefined;
  let documentRoot = "";
  let fhirSystem = "";
  let fhirValue = "";

  const attributeValue = (
    attributes: Record<string, SaxesAttributeNS>,
    local: string,
  ) =>
    Object.values(attributes).find(
      (attribute) => attribute.local === local && attribute.uri === "",
    )?.value ?? "";

  parser.on("opentag", (node) => {
    if (stack.length === 0) {
      documentRoot = node.name;
      if (
        node.local === "ClinicalDocument" &&
        (node.uri === CDA_NAMESPACE || node.uri === "")
      ) {
        documentType = "ccda";
      } else if (node.local === "Bundle" && node.uri === FHIR_NAMESPACE) {
        documentType = "fhir";
      }
    } else if (
      documentType === "ccda" &&
      node.local === "id" &&
      node.uri === stack[0].uri &&
      stack.length === 1
    ) {
      throw new FoundEcrId(
        resolveEcrId(
          attributeValue(node.attributes, "root"),
          attributeValue(node.attributes, "extension"),
        ),
      );
    } else if (
      documentType === "fhir" &&
      node.uri === FHIR_NAMESPACE &&
      stack.length === 2 &&
      stack[1].local === "identifier" &&
      stack[1].uri === FHIR_NAMESPACE
    ) {
      if (node.local === "system") {
        fhirSystem = attributeValue(node.attributes, "value").trim();
      } else if (node.local === "value") {
        fhirValue = attributeValue(node.attributes, "value").trim();
      }
    }

    stack.push({ local: node.local, uri: node.uri });
  });

  parser.on("closetag", (node) => {
    if (
      documentType === "fhir" &&
      node.local === "identifier" &&
      node.uri === FHIR_NAMESPACE &&
      stack.length === 2 &&
      stack[0].local === "Bundle" &&
      stack[0].uri === FHIR_NAMESPACE
    ) {
      throw new FoundEcrId(
        getEcrIdFromIdentifier({ system: fhirSystem, value: fhirValue }),
      );
    }

    stack.pop();
  });

  try {
    parser.write(xmlString).close();
  } catch (error) {
    if (error instanceof FoundEcrId) {
      return error.ecrId;
    }
    throw error;
  }

  if (!documentType) {
    throw new Error(
      `Unsupported eCR XML root element: ${documentRoot || "none"}.`,
    );
  }

  throw new Error("Missing ECR identifier root and extension.");
};

/**
 * Zip an xml if needed then save to storage
 * @param body - Body of the upload containing the XML file(s) to be saved
 * @param ecrId - ID of the uploaded eCR for naming saved files
 * @returns the status and message from saving
 */
export const zipAndSaveXml = async (body: RequestBody, ecrId: string) => {
  if (body.ecr instanceof File && isZipFile(body.ecr)) {
    // Already Zipped
    const arrayBuffer = await body.ecr.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return await saveToStorage(buffer, ecrId, process.env.SOURCE, "xml");
  }

  if (typeof body.ecr === "string") {
    // XML String path
    const zip = new JSZip();
    zip.file(`${ecrId}-eICR.xml`, body.ecr);

    // add RR if exists and is string
    if (typeof body.rr === "string") {
      zip.file(`${ecrId}-RR.xml`, body.rr);
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    return await saveToStorage(zipBuffer, ecrId, process.env.SOURCE, "xml");
  }

  // XML file path
  const zip = new JSZip();

  const ecrArrayBuf = await body.ecr.arrayBuffer();
  zip.file(`${ecrId}-eICR.xml`, Buffer.from(ecrArrayBuf));

  if (body.rr instanceof File) {
    const rrArrayBuf = await body.rr.arrayBuffer();
    zip.file(`${ecrId}-RR.xml`, Buffer.from(rrArrayBuf));
  }

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
  return await saveToStorage(zipBuffer, ecrId, process.env.SOURCE, "xml");
};

/**
 * Extract the first XML document from a legacy C-CDA ZIP upload.
 * @param file - The zipped file
 * @returns The XML string from inside the zip file
 */
export const unzipXml = async (file: File) => {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  const xmlEntries = Object.entries(zip.files).filter(([name, entry]) => {
    return (
      !entry.dir &&
      !name.startsWith("__MACOSX/") &&
      !name.startsWith("._") &&
      name.endsWith(".xml")
    );
  });

  // Match orchestration's ZIP contract so an RR that appears first cannot be
  // mistaken for the eICR during the pre-conversion duplicate check.
  const ecrEntry =
    xmlEntries.find(([name]) => name.includes("CDA_eICR.xml")) ?? xmlEntries[0];
  if (ecrEntry) {
    return await ecrEntry[1].async("string");
  }

  throw new Error("No XML file found in the provided zip.");
};
