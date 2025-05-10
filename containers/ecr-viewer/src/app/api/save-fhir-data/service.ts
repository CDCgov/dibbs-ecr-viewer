import { randomUUID } from "crypto";

import { Bundle } from "fhir/r4";
import { Kysely, Transaction } from "kysely";

import {
  deleteFromAzure,
  saveToAzure,
} from "@/app/data/blobStorage/azureClient";
import { deleteFromGCP, saveToGCP } from "@/app/data/blobStorage/gcpClient";
import { deleteFromS3, saveToS3 } from "@/app/data/blobStorage/s3Client";
import {
  S3_SOURCE,
  AZURE_SOURCE,
  GCP_SOURCE,
} from "@/app/data/blobStorage/utils";
import { getDb } from "@/app/data/metadataDb/database";
import { Core } from "@/app/data/metadataDb/types/core";
import { Extended } from "@/app/data/metadataDb/types/extended";
import { dbSchema } from "@/app/data/metadataDb/utils/db-config";

import { BundleExtendedMetadata, BundleMetadata } from "./types";

interface SaveResponse {
  message: string;
  status: number;
}

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
  const body = JSON.stringify(fhirBundle);
  const objectKey = `${ecrId}.json`;
  if (saveSource === S3_SOURCE) {
    return await saveToS3(body, objectKey);
  } else if (saveSource === AZURE_SOURCE) {
    return await saveToAzure(body, objectKey);
  } else if (saveSource === GCP_SOURCE) {
    return await saveToGCP(body, objectKey);
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
 * @function deleteFhirData
 * @param ecrId - The unique identifier for the Electronic Case Reporting (ECR) associated with the FHIR bundle.
 * @param saveSource - The location to save the FHIR bundle.
 * @returns An object containing the status and message.
 */
export const deleteFhirData = async (
  ecrId: string,
  saveSource: string,
): Promise<SaveResponse> => {
  const objectKey = `${ecrId}.json`;
  if (saveSource === S3_SOURCE) {
    return await deleteFromS3(objectKey);
  } else if (saveSource === AZURE_SOURCE) {
    return await deleteFromAzure(objectKey);
  } else if (saveSource === GCP_SOURCE) {
    return await deleteFromGCP(objectKey);
  } else {
    return {
      message:
        'Invalid save source. Please provide a valid value for \'saveSource\' ("s3", "azure", or "gcp").',
      status: 400,
    };
  }
};

/**
 * @param ecrId - The unique identifier for the Electronic Case Reporting (ECR) associated with the FHIR bundle.
 * @param metadataType - Whether metadata is persisted using the "core" or "extended" schema
 * @param metadata - The metadata to be saved.
 * @param fhirDataPromise - promise that resolves to whether the fhir bundle saved
 * @param rollbackFhirDataFn - thunk to roll back the saving of the fhir bundle
 * @returns An object containing the status and message.
 */
export const saveFhirMetadata = async (
  ecrId: string,
  metadataType: "core" | "extended" | undefined,
  metadata: BundleMetadata | BundleExtendedMetadata,
  fhirDataPromise: Promise<SaveResponse>,
  rollbackFhirDataFn: () => Promise<SaveResponse>,
): Promise<SaveResponse> => {
  let rollBackFhirData = true;

  try {
    if (!metadata) {
      console.error("eICR Data is required.");
      return {
        message: "Failed: eICR Data is required.",
        status: 400,
      };
    }

    // Start transaction
    return await getDb<Core>()
      .transaction()
      .execute(async (trx) => {
        // check ecr doesn't already exist
        const res = await trx
          .selectFrom("ecr_data")
          .select((eb) => eb.fn.countAll().as("num_ecr"))
          .where("ecr_data.eicr_id", "=", ecrId)
          .executeTakeFirst();
        if (res && Number(res.num_ecr) > 0) {
          return {
            message: `eCR already loaded: ${ecrId}`,
            status: 409,
          };
        }

        // Insert main ECR metadata
        if (metadataType === "core") {
          await saveCoreMetadata(trx, metadata as BundleMetadata, ecrId);
        } else if (metadataType === "extended") {
          await saveExtendedMetadata(
            trx as unknown as Transaction<Extended>,
            metadata as BundleExtendedMetadata,
            ecrId,
          );
        } else {
          return {
            message: "Unknown metadataType: " + metadataType,
            status: 400,
          };
        }

        // The actual type here is a beast, but we know that this mapping is functionally sound
        await saveRR(trx as unknown as Kysely<Core>, metadata, ecrId);

        // Make sure the fhir data also saves
        const fhirDataResponse = await fhirDataPromise;
        if (fhirDataResponse.status !== 200) {
          rollBackFhirData = false;
          throw new Error(
            `Failed to save fhir data - rolling back metadata: ${JSON.stringify(
              fhirDataResponse,
            )}`,
          );
        }

        return {
          message: "Success. Saved metadata to database.",
          status: 200,
        };
      });
  } catch (error: unknown) {
    const message = "Failed to insert metadata to database.";
    console.error({ message, error, ecrId });

    if (rollBackFhirData) {
      await rollbackFhirDataFn();
    }

    return {
      message,
      status: 500,
    };
  }
};

/**
 * @async
 * @function saveExtendedMetaData
 * @param trx kyseley transaction
 * @param metadata - The FHIR bundle metadata to be saved.
 * @param ecrId - The unique identifier for the Electronic Case Reporting (ECR) associated with the FHIR bundle.
 * @returns An object containing the status and message.
 */
const saveExtendedMetadata = async (
  trx: Transaction<Extended>,
  metadata: BundleExtendedMetadata,
  ecrId: string,
): Promise<void> => {
  await trx
    .insertInto("ecr_data")
    .values({
      eicr_id: ecrId,
      set_id: metadata.eicr_set_id || ecrId,
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
        test_result_ref_range_high: test_result_reference_range_high_value,
        test_result_ref_range_low_units: test_result_reference_range_low_units,
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
};

/**
 * Saves a FHIR bundle metadata to a postgres database.
 * @param trx kyseley transaction
 * @param metadata - The FHIR bundle metadata to be saved.
 * @param ecrId - The unique identifier for the Electronic Case Reporting (ECR) associated with the FHIR bundle.
 * @returns An object containing the status and message.
 */
const saveCoreMetadata = async (
  trx: Transaction<Core>,
  metadata: BundleMetadata,
  ecrId: string,
): Promise<void> => {
  await trx
    .insertInto("ecr_data")
    .values({
      eicr_id: ecrId,
      set_id: metadata.eicr_set_id || ecrId,
      last_name: metadata.last_name,
      first_name: metadata.first_name,
      birth_date: metadata.birth_date,
      encounter_start_date: new Date(metadata.report_date),
      eicr_version_number: metadata.eicr_version_number,
    })
    .execute();
};

// Helper to save RR to the database (common across schemas)
const saveRR = async (
  trx: Kysely<Core>,
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
        condition_code: rrItem.condition_code,
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
  try {
    return await saveFhirMetadata(
      ecrId,
      dbSchema(),
      metadata as BundleMetadata | BundleExtendedMetadata,
      saveFhirData(fhirBundle, ecrId, saveSource),
      () => deleteFhirData(ecrId, saveSource),
    );
  } catch (error: unknown) {
    const message = "Failed to save FHIR data with metadata.";
    console.error({ message, error, ecrId });
    return {
      message,
      status: 500,
    };
  }
};

// helper to parse a maybe string into a date or undefined
const asDate = (d: string | undefined): Date | undefined => {
  if (!d) return undefined;

  return new Date(d);
};
