<<<<<<< HEAD
=======
import { BlobServiceClient } from "@azure/storage-blob";
import { PutObjectCommand, PutObjectCommandOutput } from "@aws-sdk/client-s3";
import { Bundle } from "fhir/r4";
import { S3_SOURCE, AZURE_SOURCE } from "@/app/api/utils";
>>>>>>> 600af32 (FHIR Implementation Testing)
import { randomUUID } from "crypto";

import { PutObjectCommand, PutObjectCommandOutput } from "@aws-sdk/client-s3";
import { BlobServiceClient } from "@azure/storage-blob";
import { Bundle } from "fhir/r4";
import sql from "mssql";

import { s3Client } from "@/app/api/services/s3Client";
import { S3_SOURCE, AZURE_SOURCE } from "@/app/api/utils";
import { getDB } from "@/app/data/db/postgres_db";
import { get_pool } from "@/app/data/db/sqlserver_db";

import { BundleExtendedMetadata, BundleMetadata } from "./types";
<<<<<<< HEAD
=======
import { s3Client } from "../services/s3Client";
import { db } from '../services/database'
>>>>>>> 600af32 (FHIR Implementation Testing)

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
export const saveToS3 = async (fhirBundle: Bundle, ecrId: string) => {
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
export const saveToAzure = async (
  fhirBundle: Bundle,
  ecrId: string,
): Promise<SaveResponse> => {
  // TODO: Make this global after we get Azure access
  const blobClient = BlobServiceClient.fromConnectionString(
    process.env.AZURE_STORAGE_CONNECTION_STRING!,
  );

  if (!process.env.AZURE_CONTAINER_NAME)
    throw Error("Azure container name not found");

  const containerName = process.env.AZURE_CONTAINER_NAME;
  const blobName = `${ecrId}.json`;
  const body = JSON.stringify(fhirBundle);

  try {
    const containerClient = blobClient.getContainerClient(containerName);
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
  } else {
    return {
      message:
        'Invalid save source. Please provide a valid value for \'saveSource\' ("s3", or "azure").',
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
    if (metadataType == "core") {
      return await saveCoreMetadata(metadata as BundleMetadata, ecrId);
    } else if (metadataType == "extended") {
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
/*
TODO
- write saveCoreMetadata
- write saveExtendedMetadata (both of these can be collapsed from their old selves since Kysely does most of the work now)
- change their references
- search for any other instances of pg pool and mssql pool and change them to kysely
*/

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
<<<<<<< HEAD
  const pool = await get_pool();

  if (!pool) {
    return { message: "Failed to connect to SQL Server.", status: 500 };
  }

  if (process.env.METADATA_DATABASE_SCHEMA === "extended") {
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
=======

  if (process.env.METADATA_DATABASE_SCHEMA == "extended") {
>>>>>>> 600af32 (FHIR Implementation Testing)
    try {
      await db.transaction().execute(async (trx) => {
        await trx.insertInto("ecr_data").values({
          eICR_ID: ecrId,
          set_id: metadata.eicr_set_id,
          fhir_reference_link: null, // Not implemented yet
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
          authoring_date: metadata.authoring_datetime,
          authoring_provider: metadata.provider_id,
          provider_id: metadata.provider_id,
          facility_id: metadata.facility_id_number,
          facility_name: metadata.facility_name,
          encounter_type: metadata.encounter_type,
          encounter_start_date: metadata.encounter_start_date,
          encounter_end_date: metadata.encounter_end_date,
          reason_for_visit: metadata.reason_for_visit,
          active_problems: metadata.active_problems,
        })
        
        if (metadata.patient_addresses) {
          for (const address of metadata.patient_addresses) {
            const patient_address_uuid = randomUUID();
            await trx.insertInto("patient_address").values({
              uuid: patient_address_uuid,
              use: address.use,
              type: address.type,
              text: address.text,
              line: address.line,
              city: address.city,
              district: address.district,
              state: address.state,
              postal_code: address.postal_code,
              country: address.country,
              period_start: address.period_start,
              period_end: address.period_end,
              eICR_ID: ecrId
          })
        }}
      
        if (metadata.labs) {
          for (const lab of metadata.labs) {
            await trx.insertInto("ecr_labs").values({
              uuid: lab.uuid,
              eICR_ID: ecrId,
              test_type: lab.test_type,
              test_type_code: lab.test_type_code,
              test_type_system: lab.test_type_system,
              test_result_qualitative: lab.test_result_qualitative,
              test_result_quantitative: lab.test_result_quantitative,
              test_result_units: lab.test_result_units,
              test_result_code: lab.test_result_code,
              test_result_code_display: lab.test_result_code_display,
              test_result_code_system: lab.test_result_code_system,
              test_result_interpretation: lab.test_result_interpretation,
              test_result_interpretation_code: lab.test_result_interpretation_code,
              test_result_interpretation_system: lab.test_result_interpretation_system,
              test_result_reference_range_low_value: lab.test_result_ref_range_low,
              test_result_reference_range_low_units: lab.test_result_ref_range_low_units,
              test_result_reference_range_high_value: lab.test_result_ref_range_high,
              test_result_reference_range_high_units: lab.test_result_ref_range_high_units,
              specimen_type: lab.specimen_type,
              specimen_collection_date: lab.specimen_collection_date,
              performing_lab: lab.performing_lab
            })
          }
        }

        if (metadata.rr) {
          // Loop through each condition/rule object in rr array
          for (const rrItem of metadata.rr) {
            const rr_conditions_uuid = randomUUID();
  
            // Insert condition into ecr_rr_conditions
            await trx.insertInto("ecr_rr_conditions").values({
              uuid: rr_conditions_uuid,
              eICR_ID: ecrId,
              condition: rrItem.condition
            })
  
            // Loop through the rule summaries array
            if (rrItem.rule_summaries && rrItem.rule_summaries.length > 0) {
              for (const summary of rrItem.rule_summaries) {
  
                // Insert each rule summary with reference to the condition
                await trx.insertInto("ecr_rr_rule_summaries").values({
                  uuid: randomUUID(),
                  ecr_rr_conditions_id: rr_conditions_uuid,
                  rule_summary: summary.summary
                })
              }
            }
          }
        }
<<<<<<< HEAD
      }

      await transaction.commit();

      return {
        message: "Success. Saved metadata to database.",
        status: 200,
      };
    } catch (error: unknown) {
=======
        })
        return {
          message: "Success. Saved metadata to database.",
          status: 200,
        };
    } catch (error: any) {
>>>>>>> 600af32 (FHIR Implementation Testing)
      console.error({
        message: "Failed to insert metadata to sqlserver.",
        error,
        ecrId,
      });

      return {
        message: "Failed to insert metadata to database.",
        status: 500,
      };
    }
  } else {
    return {
      message:
        "Only the extended metadata schema is implemented for SQL Server.",
      status: 501,
    };
  }
};

/**
 * Saves a FHIR bundle metadata to a postgres database.
 * @async
 * @function saveMetadataToPostgres
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
    await db.transaction().execute(async (trx) => {
      try {
        // Insert main ECR metadata  
        await trx.insertInto("ecr_data").values({
          eICR_ID: ecrId,
          set_id: metadata.eicr_set_id,
          patient_name_last: metadata.last_name,
          patient_name_first: metadata.first_name,
          patient_birth_date: metadata.birth_date,
          data_source: "DB",
          report_date: metadata.report_date,
          eicr_version_number: metadata.eicr_version_number,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

        // Loop through each condition/rule object in rr array
        if (metadata.rr && metadata.rr.length > 0) {
          for (const rrItem of metadata.rr) {
            // Insert condition into ecr_rr_conditions
            const saveRRConditions = await trx.insertInto("ecr_rr_conditions").values({
              uuid: randomUUID(),
              eICR_ID: ecrId,
              condition: rrItem.condition
            })
            .returning("uuid")
            .executeTakeFirstOrThrow();

            // Loop through the rule summaries array
            if (rrItem.rule_summaries && rrItem.rule_summaries.length > 0) {
              for (const summaryObj of rrItem.rule_summaries) {
                // Insert each associated summary into ecr_rr_rule_summaries
                await trx.insertInto("ecr_rr_rule_summaries").values({
                  uuid: randomUUID(),
                  ecr_rr_conditions_id: saveRRConditions.uuid,
                  rule_summary: summaryObj.summary
                })
                .returningAll()
                .executeTakeFirstOrThrow();
              }
            }
          }
        }
      } catch (error) {
        console.error("Transaction failed:", error);
        throw new Error("Transaction failed"); // Ensure transaction failure is handled
      }
    });

    // On successful transaction, return response
    return {
      message: "Success. Saved metadata to database.",
      status: 200,
    };
  } catch (error: unknown) {
    console.error({
      message: `Error inserting metadata to postgres.`,
      error,
      ecrId,
    });
    return {
      message: "Failed to insert metadata to database.",
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
  const metadataType = process.env.METADATA_DATABASE_SCHEMA;
  
  try {
    [fhirDataResult, metadataResult] = await Promise.all([
      saveFhirData(fhirBundle, ecrId, saveSource),
      saveFhirMetadata(ecrId, metadataType, metadata as BundleMetadata),
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
