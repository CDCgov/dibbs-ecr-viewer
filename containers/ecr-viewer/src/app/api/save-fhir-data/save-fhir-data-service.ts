import { randomUUID } from "crypto";

import { PutObjectCommand, PutObjectCommandOutput } from "@aws-sdk/client-s3";
import { Bundle } from "fhir/r4";
import { Kysely } from "kysely";

import { dbSchema, getDb } from "@/app/api/services/database";
import { Common } from "@/app/api/services/types/common";
import { Core } from "@/app/api/services/types/core";
import { Extended } from "@/app/api/services/types/extended";
import { S3_SOURCE, AZURE_SOURCE, GCP_SOURCE } from "@/app/api/utils";
import { azureBlobContainerClient } from "@/app/data/blobStorage/azureClient";
import { gcpClient } from "@/app/data/blobStorage/gcpClient";
import { s3Client } from "@/app/data/blobStorage/s3Client";

import { BundleExtendedMetadata, BundleMetadata } from "./types";

interface SaveResponse {
  message: string;
  status: number;
}

/**
 * Saves a FHIR bundle to an AWS S3 bucket.
 * @async
 * @function saveToS3
 * @param fhirBundle - The FHIR bundle to be saved.
 * @param ecrId - The unique identifier for the Electronic Case Reporting (ECR) associated with the FHIR bundle.
 * @returns An object containing the status and message.
 */
const saveToS3 = async (fhirBundle: Bundle, ecrId: string) => {
  const bucketName = process.env.ECR_BUCKET_NAME;
  const objectKey = `${ecrId}.json`;
  const body = JSON.stringify(fhirBundle);

  try {
    const input = {
      Body: body,
      Bucket: bucketName,
      Key: objectKey,
      ContentType: "application/json",
    };
    const command = new PutObjectCommand(input);
    const response: PutObjectCommandOutput = await s3Client.send(command);
    const httpStatusCode = response?.$metadata?.httpStatusCode;

    if (httpStatusCode !== 200) {
      throw new Error(`HTTP Status Code: ${httpStatusCode}`);
    }

    return {
      message: "Success. Saved FHIR bundle.",
      status: 200,
    };
  } catch (error: unknown) {
    console.error({
      message: "Failed to save FHIR bundle to S3.",
      error,
      ecrId,
    });
    return {
      message: "Failed to save FHIR bundle.",
      status: 500,
    };
  }
};

/**
 * Saves a FHIR bundle to Azure Blob Storage.
 * @async
 * @function saveToAzure
 * @param fhirBundle - The FHIR bundle to be saved.
 * @param ecrId - The unique ID for the eCR associated with the FHIR bundle.
 * @returns An object containing the status and message.
 */
const saveToAzure = async (
  fhirBundle: Bundle,
  ecrId: string,
): Promise<SaveResponse> => {
  const containerClient = azureBlobContainerClient();
  const blobName = `${ecrId}.json`;
  const body = JSON.stringify(fhirBundle);

  if (!containerClient) {
    return {
      message: "Failed to save FHIR bundle due to misconfiguration of client.",
      status: 500,
    };
  }

  try {
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const response = await blockBlobClient.upload(body, body.length, {
      blobHTTPHeaders: { blobContentType: "application/json" },
    });

    if (response._response.status !== 201) {
      throw new Error(`HTTP Status Code: ${response._response.status}`);
    }

    return {
      message: "Success. Saved FHIR bundle.",
      status: 200,
    };
  } catch (error: unknown) {
    console.error({
      message: "Failed to save FHIR bundle to Azure Blob Storage.",
      error,
      ecrId,
    });
    return {
      message: "Failed to save FHIR bundle.",
      status: 500,
    };
  }
};

/**
 * Saves a FHIR bundle to Google Cloud Storage.
 * @param fhirBundle - The FHIR bundle to be saved.
 * @param ecrId - The unique ID for the eCR associated with the FHIR bundle.
 * @returns An object containing the status and message.
 */
const saveToGCP = async (
  fhirBundle: Bundle,
  ecrId: string,
): Promise<SaveResponse> => {
  const containerClient = gcpClient();
  const blobName = `${ecrId}.json`;
  const body = JSON.stringify(fhirBundle);

  if (!containerClient) {
    return {
      message: "Failed to save the FHIR bundle due to misconfiguration.",
      status: 500,
    };
  }
  try {
    await containerClient.file(blobName).save(body);

    return {
      message: "Success. Saved FHIR bundle.",
      status: 200,
    };
  } catch (error: unknown) {
    console.error({
      message: "Failed to save FHIR bundle to Google Cloud Storage.",
      error,
      ecrId,
    });
    return {
      message: "Failed to save FHIR bundle.",
      status: 500,
    };
  }
};

/**
 * @async
 * @function saveFhirData
 * @param fhirBundle - The FHIR bundle to be saved.
 * @param ecrId - The unique identifier for the Electronic Case Reporting (ECR) associated with the FHIR bundle.
 * @param saveSource - The location to save the FHIR bundle.
 * @returns An object containing the status and message.
 */
export const saveFhirData = async (
  fhirBundle: Bundle,
  ecrId: string,
  saveSource: string,
): Promise<SaveResponse> => {
  if (saveSource === S3_SOURCE) {
    return await saveToS3(fhirBundle, ecrId);
  } else if (saveSource === AZURE_SOURCE) {
    return await saveToAzure(fhirBundle, ecrId);
  } else if (saveSource === GCP_SOURCE) {
    return await saveToGCP(fhirBundle, ecrId);
  } else {
    return {
      message:
        'Invalid save source. Please provide a valid value for \'saveSource\' ("s3", "azure", or "gcp").',
      status: 400,
    };
  }
};

/**
 * @async
 * @function saveFhirMetadata
 * @param ecrId - The unique identifier for the Electronic Case Reporting (ECR) associated with the FHIR bundle.
 * @param metadataType - Whether metadata is persisted using the "core" or "extended" schema
 * @param metadata - The metadata to be saved.
 * @returns An object containing the status and message.
 */
const saveFhirMetadata = async (
  ecrId: string,
  metadataType: "core" | "extended" | undefined,
  metadata: BundleMetadata | BundleExtendedMetadata,
): Promise<SaveResponse> => {
  try {
    if (metadataType === "core") {
      return await saveCoreMetadata(metadata as BundleMetadata, ecrId);
    } else if (metadataType === "extended") {
      return await saveExtendedMetadata(
        metadata as BundleExtendedMetadata,
        ecrId,
      );
    } else {
      return {
        message: "Unknown metadataType: " + metadataType,
        status: 400,
      };
    }
  } catch (error: unknown) {
    const message = "Failed to save FHIR metadata.";
    console.error({ message, error, ecrId });
    return {
      message,
      status: 500,
    };
  }
};

/**
 * @async
 * @function saveExtendedMetaData
 * @param metadata - The FHIR bundle metadata to be saved.
 * @param ecrId - The unique identifier for the Electronic Case Reporting (ECR) associated with the FHIR bundle.
 * @returns An object containing the status and message.
 */
export const saveExtendedMetadata = async (
  metadata: BundleExtendedMetadata,
  ecrId: string,
): Promise<SaveResponse> => {
  try {
    await getDb<Extended>()
      .transaction()
      .execute(async (trx) => {
        await trx
          .insertInto("ecr_data")
          .values({
            eicr_id: ecrId,
            set_id: metadata.eicr_set_id,
            last_name: metadata.last_name,
            first_name: metadata.first_name,
            birth_date: metadata.birth_date,
            gender: metadata.gender,
            birth_sex: metadata.birth_sex,
            gender_identity: metadata.gender_identity,
            race: metadata.race,
            ethnicity: metadata.ethnicity,
            latitude: metadata.latitude,
            longitude: metadata.longitude,
            homelessness_status: metadata.homelessness_status,
            disabilities: metadata.disabilities,
            tribal_affiliation: metadata.tribal_affiliation,
            tribal_enrollment_status: metadata.tribal_enrollment_status,
            current_job_title: metadata.current_job_title,
            current_job_industry: metadata.current_job_industry,
            usual_occupation: metadata.usual_occupation,
            usual_industry: metadata.usual_industry,
            preferred_language: metadata.preferred_language,
            pregnancy_status: metadata.pregnancy_status,
            rr_id: metadata.rr_id,
            processing_status: metadata.processing_status,
            eicr_version_number: metadata.eicr_version_number,
            authoring_date: asDate(metadata.authoring_datetime),
            authoring_provider: metadata.provider_id,
            provider_id: metadata.provider_id,
            facility_id: metadata.facility_id_number,
            facility_name: metadata.facility_name,
            encounter_type: metadata.encounter_type,
            encounter_start_date: asDate(metadata.encounter_start_date),
            encounter_end_date: asDate(metadata.encounter_end_date),
            reason_for_visit: metadata.reason_for_visit,
            active_problems: metadata.active_problems,
          })
          .execute();
        if (metadata.patient_addresses) {
          for (const address of metadata.patient_addresses) {
            const patient_address_uuid = randomUUID();
            await trx
              .insertInto("patient_address")
              .values({
                uuid: patient_address_uuid,
                ...address,
                period_start: asDate(address.period_start),
                period_end: asDate(address.period_end),
                eicr_id: ecrId,
              })
              .execute();
          }
        }
        if (metadata.labs) {
          for (const lab of metadata.labs) {
            // some fields need renaming
            const {
              test_result_ref_range_low: test_result_reference_range_low_value,
              test_result_ref_range_high:
                test_result_reference_range_high_value,
              test_result_ref_range_low_units:
                test_result_reference_range_low_units,
              test_result_ref_range_high_units:
                test_result_reference_range_high_units,
              ...labValues
            } = lab;
            await trx
              .insertInto("ecr_labs")
              .values({
                ...labValues,
                test_result_reference_range_low_value,
                test_result_reference_range_high_value,
                test_result_reference_range_low_units,
                test_result_reference_range_high_units,
                eicr_id: ecrId,
                specimen_collection_date: asDate(lab.specimen_collection_date),
              })
              .execute();
          }
        }

        // The actual type here is a beast, but we know that this mapping is functionally sound
        await saveRR(trx as unknown as Kysely<Common>, metadata, ecrId);
      });
    return {
      message: "Success. Saved metadata to database.",
      status: 200,
    };
  } catch (error: unknown) {
    const message = "Failed to insert metadata to database.";
    console.error({ message, error });
    return {
      message,
      status: 500,
    };
  }
};

// Helper to save RR to the database (common across schemas)
const saveRR = async (
  trx: Kysely<Common>,
  metadata: BundleMetadata | BundleExtendedMetadata,
  ecrId: string,
) => {
  if (!metadata.rr) return;

  // Loop through each condition/rule object in rr array
  for (const rrItem of metadata.rr) {
    const rr_conditions_uuid = randomUUID();
    // Insert condition into ecr_rr_conditions
    await trx
      .insertInto("ecr_rr_conditions")
      .values({
        uuid: rr_conditions_uuid,
        eicr_id: ecrId,
        condition: rrItem.condition,
      })
      .execute();
    // Loop through the rule summaries array
    if (rrItem.rule_summaries && rrItem.rule_summaries.length > 0) {
      for (const summary of rrItem.rule_summaries) {
        // Insert each rule summary with reference to the condition
        await trx
          .insertInto("ecr_rr_rule_summaries")
          .values({
            uuid: randomUUID(),
            ecr_rr_conditions_id: rr_conditions_uuid,
            rule_summary: summary.summary,
          })
          .execute();
      }
    }
  }
};

/**
 * Saves a FHIR bundle metadata to a postgres database.
 * @async
 * @function saveCoreMetadata
 * @param metadata - The FHIR bundle metadata to be saved.
 * @param ecrId - The unique identifier for the Electronic Case Reporting (ECR) associated with the FHIR bundle.
 * @returns An object containing the status and message.
 */
export const saveCoreMetadata = async (
  metadata: BundleMetadata,
  ecrId: string,
): Promise<SaveResponse> => {
  try {
    if (!metadata) {
      console.error("eICR Data is required.");
      return {
        message: "Failed: eICR Data is required.",
        status: 400,
      };
    }

    // Start transaction
    await getDb<Core>()
      .transaction()
      .execute(async (trx) => {
        // Insert main ECR metadata
        await trx
          .insertInto("ecr_data")
          .values({
            eicr_id: ecrId,
            set_id: metadata.eicr_set_id,
            patient_name_last: metadata.last_name,
            patient_name_first: metadata.first_name,
            patient_birth_date: metadata.birth_date,
            data_source: "DB",
            report_date: new Date(metadata.report_date),
            eicr_version_number: metadata.eicr_version_number,
          })
          .execute();

        // The actual type here is a beast, but we know that this mapping is functionally sound
        await saveRR(trx as unknown as Kysely<Common>, metadata, ecrId);
      });
    return {
      message: "Success. Saved metadata to database.",
      status: 200,
    };
  } catch (error: unknown) {
    const message = "Failed to insert metadata to database.";
    console.error({ message, error });
    return {
      message,
      status: 500,
    };
  }
};

/**
 * @async
 * @function saveWithMetadata
 * @param fhirBundle - The FHIR bundle to be saved.
 * @param ecrId - The unique identifier for the Electronic Case Reporting (ECR) associated with the FHIR bundle.
 * @param saveSource - The location to save the FHIR bundle.
 * @param metadata - The metadata to be saved with the FHIR bundle.
 * @returns An object containing the status and message.
 */
export const saveWithMetadata = async (
  fhirBundle: Bundle,
  ecrId: string,
  saveSource: string,
  metadata: BundleMetadata | BundleExtendedMetadata,
): Promise<SaveResponse> => {
  let fhirDataResult;
  let metadataResult;

  try {
    [fhirDataResult, metadataResult] = await Promise.all([
      saveFhirData(fhirBundle, ecrId, saveSource),
      saveFhirMetadata(
        ecrId,
        dbSchema(),
        metadata as BundleMetadata | BundleExtendedMetadata,
      ),
    ]);
  } catch (error: unknown) {
    const message = "Failed to save FHIR data with metadata.";
    console.error({ message, error, ecrId });
    return {
      message,
      status: 500,
    };
  }

  let responseMessage = "";
  let responseStatus = 200;
  if (fhirDataResult.status !== 200) {
    responseMessage += "Failed to save FHIR data.\n";
    responseStatus = fhirDataResult.status;
  } else {
    responseMessage += "Saved FHIR data.\n";
  }
  if (metadataResult.status !== 200) {
    responseMessage += "Failed to save metadata.";
    responseStatus = metadataResult.status;
  } else {
    responseMessage += "Saved metadata.";
  }

  return { message: responseMessage, status: responseStatus };
};

// helper to parse a maybe string into a date or undefined
const asDate = (d: string | undefined): Date | undefined => {
  if (!d) return undefined;

  return new Date(d);
};
