import { XMLParser } from "fast-xml-parser";
import { Bundle } from "fhir/r4";

import {
  saveToStorage,
  saveWithMetadata,
} from "@/app/api/save-fhir-data/service";
import {
  BundleExtendedMetadata,
  BundleMetadata,
} from "@/app/api/save-fhir-data/types";
import { dbDialect, dbSchema } from "@/app/data/metadataDb/utils/db-config";
import JSZip from "jszip";

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
 * @returns orchestration response
 */
export const getOrchestrationResponse = async ({
  ecr,
  rr,
}: RequestBody): Promise<BundleInfo> => {
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
  const ecrId = bundle.id!;
  if (metadata) {
    return saveWithMetadata(bundle, ecrId, process.env.SOURCE, metadata);
  } else {
    return saveToStorage(bundle, ecrId, process.env.SOURCE, "fhir");
  }
};

/**
 * Save the zip via orchestration
 * @param body - Parsed body of the request
 * @param returnBundle - whether to return the fhir bundle (default false)
 * @returns An object containing the status and message.
 */
export const orchestrationRequest = async (
  body: RequestBody,
  returnBundle: boolean = false,
) => {
  let orchestrationResp: BundleInfo;
  try {
    orchestrationResp = await getOrchestrationResponse(body);
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
 * Save the original uploaded XML to storage
 * @param body - Parsed body of the request
 * @returns The eCR ID as a string
 */
export const getEcrIdFromXml = async (
    body: RequestBody,
): Promise<string> => {

  if (typeof body.ecr === "string") {
    const output = xmlToJson(body.ecr)
    return output.ClinicalDocument.id["@_root"]

  } else if (body.ecr instanceof File && body.ecr.type === "application/xml") {
    const output = xmlToJson(await body.ecr.text())
    return output.ClinicalDocument.id["@_root"]

  } else if (body.ecr instanceof File && (body.ecr.type === "application/zip" || body.ecr.type === "application/octet-stream")) {

    const unzipped = await unzipXml(body.ecr)
    const output = xmlToJson(unzipped)
    return output.ClinicalDocument.id["@_root"]
  } else {
    throw new Error("Unsupported upload type. eCRs must be an xml string, XML file, or zipped XML file");
  }
};

/**
 * Parse an XML string into JSON
 * @param xmlString - The string to be parsed
 * @returns A JSON object containing the data from the XML string
 */
export const xmlToJson = (xmlString: string) => {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    trimValues: true,
  });
  return parser.parse(xmlString);
}


/**
 * Zip an xml if needed then save to storage
 * @param body - Body of the upload containing the XML file(s) to be saved
 * @param ecrId - ID of the uploaded eCR for naming saved files
 */
export const zipAndSaveXml = async (
    body: RequestBody,
    ecrId: string
) => {
  if (body.ecr instanceof File && (body.ecr.type === "application/zip" || body.ecr.type === "application/octet-stream")) {
    // Already Zipped
    const arrayBuffer = await body.ecr.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await saveToStorage(buffer, ecrId, process.env.SOURCE, "xml");

  } else if (typeof body.ecr === "string") {
    // XML String path
    const zip = new JSZip();

    zip.file(`${ecrId}-CDA_eICR.xml`, body.ecr);

    // add RR if exists and is string
    if (body.rr === "string") {
      zip.file(`${ecrId}-CDA_RR.xml`, body.rr);
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    await saveToStorage(zipBuffer, ecrId, process.env.SOURCE, "xml");
  } else if (body.ecr instanceof File) {
    // XML file path
    const zip = new JSZip();

    const ecrArrayBuf = await body.ecr.arrayBuffer();
    zip.file(`${ecrId}-CDA_eICR.xml`, Buffer.from(ecrArrayBuf));

    if (body.rr instanceof File) {
      const rrArrayBuf = await body.rr.arrayBuffer();
      zip.file(`${ecrId}-CDA_RR.xml`, Buffer.from(rrArrayBuf));
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    await saveToStorage(zipBuffer, ecrId, process.env.SOURCE, "xml");
  }
}


/**
 * Unzip and clean up a zipped XML
 * @param file - The zipped file
 * @returns The XML string from inside the zip file
 */
export const unzipXml = async (file: File) => {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  // Looping through the files in the zip and ignoring junk files added by Mac zipping utils
  for (const [name, entry] of Object.entries(zip.files)) {
    if (entry.dir || name.startsWith("__MACOSX/") || name.startsWith("._")) continue;
    if (name.endsWith(".xml")) {
      return await entry.async("string");
    }
  }
  throw new Error("No XML file found in the provided zip.");
}