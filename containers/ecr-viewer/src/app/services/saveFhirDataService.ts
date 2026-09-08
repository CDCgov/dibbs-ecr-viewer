import { randomUUID } from "crypto";

import { Bundle } from "fhir/r4";
import { Kysely, Transaction } from "kysely";

import {
  deleteFromAzure,
  existsInAzure,
  saveToAzure,
} from "@/app/data/blobStorage/azureClient";
import {
  deleteFromGCP,
  existsInGCP,
  saveToGCP,
} from "@/app/data/blobStorage/gcpClient";
import {
  deleteFromS3,
  existsInS3,
  saveToS3,
} from "@/app/data/blobStorage/s3Client";
import {
  S3_SOURCE,
  AZURE_SOURCE,
  GCP_SOURCE,
} from "@/app/data/blobStorage/utils";
import { getDb } from "@/app/data/metadataDb/database";
import { Core } from "@/app/data/metadataDb/types/core";
import {
  Extended,
  NewECRLabSpecimens,
} from "@/app/data/metadataDb/types/extended";
import { dbSchema } from "@/app/data/metadataDb/utils/db-config";
import { createAuditRecord } from "@/app/services/auditLogService";

interface SaveResponse {
  message: string;
  status: number;
}

interface Address {
  use: "home" | "work" | "temp" | "old" | "billing" | undefined;
  line: string | undefined;
  city: string | undefined;
  district: string | undefined;
  state: string | undefined;
  postal_code: string | undefined;
  country: string | undefined;
  period_start: string | undefined;
  period_end: string | undefined;
}

interface Specimen {
  specimen_type: string | undefined;
  specimen_collection_date: string | undefined;
}

interface Lab {
  uuid: string | undefined;
  test_type: string | undefined;
  test_type_code: string | undefined;
  test_type_system: string | undefined;
  test_result_qualitative: string | undefined;
  test_result_quantitative: string | undefined;
  test_result_units: string | undefined;
  test_result_code: string | undefined;
  test_result_code_display: string | undefined;
  test_result_code_system: string | undefined;
  test_result_interpretation: string | undefined;
  test_result_interpretation_code: string | undefined;
  test_result_interpretation_system: string | undefined;
  test_result_reference_range_low_value: string | undefined;
  test_result_reference_range_low_units: string | undefined;
  test_result_reference_range_high_value: string | undefined;
  test_result_reference_range_high_units: string | undefined;
  performing_lab: string | undefined;
  specimens: Specimen[] | undefined;
}

interface Immunization {
  uuid: string | undefined;
  name: string | undefined;
  effective_date: string | undefined;
  status: string | undefined;
  status_reason: string | undefined;
}

interface EhrDevices {
  ehr_software: string | undefined;
  ehr_manufacturer_model: string | undefined;
}

interface ruleSummary {
  rule_summary: string;
}

interface RR {
  condition: string;
  condition_code: string | undefined;
  rule_summaries: ruleSummary[];
}

export interface BundleMetadata {
  last_name: string;
  first_name: string;
  birth_date: string;
  set_id: string | undefined;
  eicr_version_number: string | undefined;
  rr: RR[] | undefined;
  encounter_start_date: string | undefined;
  facility_name: string | undefined;
}

export interface BundleExtendedMetadata extends BundleMetadata {
  gender: string | undefined;
  race: string | undefined;
  ethnicity: string | undefined;
  patient_addresses: Address[] | undefined;
  processing_status: string | undefined;
  eicr_id: string;
  authoring_date: string | undefined;
  ehr_devices: EhrDevices[] | undefined;
  provider_id: string | undefined;
  facility_id: string | undefined;
  encounter_type: string | undefined;
  encounter_end_date: string | undefined;
  reason_for_visit: string | undefined;
  active_problems: string | undefined;
  labs: Lab[] | undefined;
  immunizations: Immunization[] | undefined;
  birth_sex: string | undefined;
  gender_identity: string | undefined;
  homelessness_status: string | undefined;
  tribal_affiliation: string | undefined;
  tribal_enrollment_status: string | undefined;
  current_job_title: string | undefined;
  current_job_industry: string | undefined;
  usual_occupation: string | undefined;
  usual_industry: string | undefined;
  preferred_language: string | undefined;
  pregnancy_status: string | undefined;
}

/**
 * @async
 * @function saveToStorage
 * @param contents - The FHIR bundle or XML zip to be saved.
 * @param ecrId - The unique identifier for the Electronic Case Reporting (eCR) associated with the FHIR bundle.
 * @param saveSource - The location to save the FHIR bundle.
 * @param fileType - The kind of file being saved, acceptable values are "xml" or "fhir"
 * @returns An object containing the status and message.
 */
export const saveToStorage = async (
  contents: Bundle | Buffer,
  ecrId: string,
  saveSource: string,
  fileType: string,
): Promise<SaveResponse> => {
  let body: string | Buffer = "";
  let objectKey = "";

  if (fileType === "fhir") {
    body = JSON.stringify(contents);
    objectKey = `${ecrId}.json`;
  } else if (fileType === "xml" && contents instanceof Buffer) {
    body = contents;
    objectKey = `${ecrId}.zip`;
  }

  if (!objectKey) {
    return {
      message: `Invalid fileType or contents for fileType "${fileType}". Could not determine object key.`,
      status: 400,
    };
  }

  if (saveSource === S3_SOURCE) {
    if (await existsInS3(objectKey)) {
      return { message: `eCR already loaded: ${ecrId}`, status: 409 };
    }
    return await saveToS3(body, objectKey);
  } else if (saveSource === AZURE_SOURCE) {
    if (await existsInAzure(objectKey)) {
      return { message: `eCR already loaded: ${ecrId}`, status: 409 };
    }
    return await saveToAzure(body, objectKey);
  } else if (saveSource === GCP_SOURCE) {
    if (await existsInGCP(objectKey)) {
      return { message: `eCR already loaded: ${ecrId}`, status: 409 };
    }
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
 * @function deleteFromStorage
 * @param ecrId - The unique identifier for the Electronic Case Reporting (eCR) associated with the FHIR bundle.
 * @param saveSource - The location to save the FHIR bundle.
 * @param fileType - The kind of file being deleted, acceptable values are "xml" or "fhir"
 * @returns An object containing the status and message.
 */
export const deleteFromStorage = async (
  ecrId: string,
  saveSource: string,
  fileType: string,
): Promise<SaveResponse> => {
  let objectKey = "";

  if (fileType === "fhir") {
    objectKey = `${ecrId}.json`;
  } else if (fileType === "xml") {
    objectKey = `${ecrId}.zip`;
  }
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
 * @param ecrId - The unique identifier for the Electronic Case Reporting (eCR) associated with the FHIR bundle.
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

        // Insert main eCR metadata
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
        if (fhirDataResponse.status === 409) {
          // Blob already exists; the DB check above confirmed no duplicate metadata,
          // so proceed — the blob is valid and we didn't create it, so skip rollback.
          rollBackFhirData = false;
        } else if (fhirDataResponse.status !== 200) {
          rollBackFhirData = false;
          throw new Error(
            `Failed to save fhir data - rolling back metadata: ${JSON.stringify(
              fhirDataResponse,
            )}`,
          );
        }

        // Add audit log here manually to make sure we log at the point when we know
        // things are good, log only the ecr, and if in the off change audit logging fails, we get the response we expect
        await createAuditRecord(trx, "ecr", "create", { eicr_id: ecrId });

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
 * @param trx Kysely transaction
 * @param metadata - The FHIR bundle metadata to be saved.
 * @param ecrId - The unique identifier for the Electronic Case Reporting (eCR) associated with the FHIR bundle.
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
      set_id: metadata.set_id || ecrId,
      last_name: metadata.last_name,
      first_name: metadata.first_name,
      birth_date: metadata.birth_date,
      gender: metadata.gender,
      birth_sex: metadata.birth_sex,
      gender_identity: metadata.gender_identity,
      race: metadata.race,
      ethnicity: metadata.ethnicity,
      homelessness_status: metadata.homelessness_status,
      tribal_affiliation: metadata.tribal_affiliation,
      tribal_enrollment_status: metadata.tribal_enrollment_status,
      current_job_title: metadata.current_job_title,
      current_job_industry: metadata.current_job_industry,
      usual_occupation: metadata.usual_occupation,
      usual_industry: metadata.usual_industry,
      preferred_language: metadata.preferred_language,
      pregnancy_status: metadata.pregnancy_status,
      processing_status: metadata.processing_status,
      eicr_version_number: metadata.eicr_version_number,
      authoring_date: asDate(metadata.authoring_date),
      authoring_provider: metadata.provider_id,
      provider_id: metadata.provider_id,
      facility_id: metadata.facility_id,
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
    let batchToInsert = [];
    let specimensToInsert: NewECRLabSpecimens[] = [];

    for (let i = 0; i < metadata.labs.length; i++) {
      const { specimens, ...lab } = metadata.labs[i];
      const record = {
        ...lab,
        eicr_id: ecrId,
      };

      batchToInsert.push(record);

      if (record.uuid && specimens?.length) {
        specimensToInsert.push(
          ...specimens.map((specimen) => ({
            uuid: randomUUID(),
            eicr_id: ecrId,
            lab_uuid: record.uuid as string,
            specimen_type: specimen.specimen_type,
            specimen_collection_date: asDate(specimen.specimen_collection_date),
          })),
        );
      }

      const numColumns = Object.keys(record).length;

      // SQL Server has a limit of 2100 parameters per query which is the lower number of the two databases we support
      const maxRowsPerBatch = Math.floor(2099 / numColumns);

      if (
        batchToInsert.length === maxRowsPerBatch ||
        i === metadata.labs.length - 1
      ) {
        await trx.insertInto("ecr_labs").values(batchToInsert).execute();

        batchToInsert = [];

        // Specimens reference ecr_labs via a foreign key, so they can only be
        // inserted once their parent lab batch has been committed.
        if (specimensToInsert.length) {
          const maxSpecimenRowsPerBatch = Math.floor(
            2099 / Object.keys(specimensToInsert[0]).length,
          );
          for (
            let j = 0;
            j < specimensToInsert.length;
            j += maxSpecimenRowsPerBatch
          ) {
            await trx
              .insertInto("ecr_lab_specimens")
              .values(specimensToInsert.slice(j, j + maxSpecimenRowsPerBatch))
              .execute();
          }

          specimensToInsert = [];
        }
      }
    }
  }

  if (metadata.immunizations) {
    for (const immunization of metadata.immunizations) {
      await trx
        .insertInto("ecr_immunizations")
        .values({
          uuid: randomUUID(),
          eicr_id: ecrId,
          effective_date: asDate(immunization.effective_date),
          name: immunization.name,
          status: immunization.status,
          status_reason: immunization.status_reason,
        })
        .execute();
    }
  }

  if (metadata.ehr_devices) {
    for (const ehr of metadata.ehr_devices) {
      await trx
        .insertInto("ecr_ehr_devices")
        .values({
          uuid: randomUUID(),
          eicr_id: ecrId,
          ehr_software: ehr.ehr_software,
          ehr_manufacturer_model: ehr.ehr_manufacturer_model,
        })
        .execute();
    }
  }
};

/**
 * Saves a FHIR bundle metadata to a postgres database.
 * @param trx Kysely transaction
 * @param metadata - The FHIR bundle metadata to be saved.
 * @param ecrId - The unique identifier for the Electronic Case Reporting (eCR) associated with the FHIR bundle.
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
      set_id: metadata.set_id || ecrId,
      last_name: metadata.last_name,
      first_name: metadata.first_name,
      birth_date: metadata.birth_date,
      encounter_start_date: asDate(metadata.encounter_start_date),
      eicr_version_number: metadata.eicr_version_number,
      facility_name: metadata.facility_name,
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
            rule_summary: summary.rule_summary,
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
 * @param ecrId - The unique identifier for the Electronic Case Reporting (eCR) associated with the FHIR bundle.
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
      saveToStorage(fhirBundle, ecrId, saveSource, "fhir"),
      () => deleteFromStorage(ecrId, saveSource, "fhir"),
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
