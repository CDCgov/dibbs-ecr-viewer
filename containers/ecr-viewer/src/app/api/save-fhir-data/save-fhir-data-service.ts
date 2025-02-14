import { BlobServiceClient } from "@azure/storage-blob";
import { getDB } from "../services/postgres_db";
import { PutObjectCommand, PutObjectCommandOutput } from "@aws-sdk/client-s3";
import { Bundle } from "fhir/r4";
import { S3_SOURCE, AZURE_SOURCE } from "@/app/api/utils";
import sql from "mssql";
import { randomUUID } from "crypto";
import { BundleExtendedMetadata, BundleMetadata } from "./types";
import { s3Client } from "../services/s3Client";
import { get_pool } from "../services/sqlserver_db";

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
  } catch (error: any) {
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
  } catch (error: any) {
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
 * @param metadataSaveLocation - the location to save the metadata
 * @param metadata - The metadata to be saved.
 * @returns An object containing the status and message.
 */
const saveFhirMetadata = async (
  ecrId: string,
  metadataSaveLocation: "postgres" | "sqlserver" | undefined,
  metadata: BundleMetadata | BundleExtendedMetadata,
): Promise<SaveResponse> => {
  try {
    if (metadataSaveLocation == "postgres") {
      return await saveMetadataToPostgres(metadata as BundleMetadata, ecrId);
    } else if (metadataSaveLocation == "sqlserver") {
      return await saveMetadataToSqlServer(
        metadata as BundleExtendedMetadata,
        ecrId,
      );
    } else {
      return {
        message: "Unknown metadataSaveLocation: " + metadataSaveLocation,
        status: 400,
      };
    }
  } catch (error: any) {
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
 * @function saveMetadataToSqlServer
 * @param metadata - The FHIR bundle metadata to be saved.
 * @param ecrId - The unique identifier for the Electronic Case Reporting (ECR) associated with the FHIR bundle.
 * @returns An object containing the status and message.
 */
export const saveMetadataToSqlServer = async (
  metadata: BundleExtendedMetadata,
  ecrId: string,
): Promise<SaveResponse> => {
  let pool = await get_pool();

  if (!pool) {
    return { message: "Failed to connect to SQL Server.", status: 500 };
  }

  if (process.env.METADATA_DATABASE_SCHEMA == "extended") {
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const ecrDataInsertRequest = new sql.Request(transaction);
      await ecrDataInsertRequest
        .input("eICR_ID", sql.VarChar(200), ecrId)
        .input("eicr_set_id", sql.VarChar(255), metadata.eicr_set_id)
        .input("fhir_reference_link", sql.VarChar(255), null) // Not implemented
        .input("last_name", sql.VarChar(255), metadata.last_name)
        .input("first_name", sql.VarChar(255), metadata.first_name)
        .input("birth_date", sql.Date, metadata.birth_date)
        .input("gender", sql.VarChar(50), metadata.gender)
        .input("birth_sex", sql.VarChar(50), metadata.birth_sex)
        .input("gender_identity", sql.VarChar(50), metadata.gender_identity)
        .input("race", sql.VarChar(255), metadata.race)
        .input("ethnicity", sql.VarChar(255), metadata.ethnicity)
        .input("latitude", sql.Float, metadata.latitude)
        .input("longitude", sql.Float, metadata.longitude)
        .input(
          "homelessness_status",
          sql.VarChar(255),
          metadata.homelessness_status,
        )
        .input("disabilities", sql.VarChar(255), metadata.disabilities)
        .input(
          "tribal_affiliation",
          sql.VarChar(255),
          metadata.tribal_affiliation,
        )
        .input(
          "tribal_enrollment_status",
          sql.VarChar(255),
          metadata.tribal_enrollment_status,
        )
        .input(
          "current_job_title",
          sql.VarChar(255),
          metadata.current_job_title,
        )
        .input(
          "current_job_industry",
          sql.VarChar(255),
          metadata.current_job_industry,
        )
        .input("usual_occupation", sql.VarChar(255), metadata.usual_occupation)
        .input("usual_industry", sql.VarChar(255), metadata.usual_industry)
        .input(
          "preferred_language",
          sql.VarChar(255),
          metadata.preferred_language,
        )
        .input("pregnancy_status", sql.VarChar(255), metadata.pregnancy_status)
        .input("rr_id", sql.VarChar(255), metadata.rr_id)
        .input(
          "processing_status",
          sql.VarChar(255),
          metadata.processing_status,
        )
        .input(
          "eicr_version_number",
          sql.VarChar(50),
          metadata.eicr_version_number,
        )
        .input("authoring_date", sql.DateTime, metadata.authoring_datetime)
        .input("authoring_provider", sql.VarChar(255), metadata.provider_id)
        .input("provider_id", sql.VarChar(255), metadata.provider_id)
        .input("facility_id", sql.VarChar(255), metadata.facility_id_number)
        .input("facility_name", sql.VarChar(255), metadata.facility_name)
        .input("encounter_type", sql.VarChar(255), metadata.encounter_type)
        .input(
          "encounter_start_date",
          sql.DateTime,
          metadata.encounter_start_date,
        )
        .input("encounter_end_date", sql.DateTime, metadata.encounter_end_date)
        .input(
          "reason_for_visit",
          sql.VarChar(sql.MAX),
          metadata.reason_for_visit,
        )
        .input(
          "active_problems",
          sql.VarChar(sql.MAX),
          metadata.active_problems,
        )
        .query(
          "INSERT INTO dbo.ECR_DATA (eICR_ID, set_id, fhir_reference_link, last_name, first_name, birth_date, gender, birth_sex, gender_identity, race, ethnicity, latitude, longitude, homelessness_status, disabilities, tribal_affiliation, tribal_enrollment_status, current_job_title, current_job_industry, usual_occupation, usual_industry, preferred_language, pregnancy_status, rr_id, processing_status, eicr_version_number, authoring_date, authoring_provider, provider_id, facility_id, facility_name, encounter_type, encounter_start_date, encounter_end_date, reason_for_visit, active_problems) VALUES (@eICR_ID, @eicr_set_id, @fhir_reference_link, @last_name, @first_name, @birth_date, @gender, @birth_sex, @gender_identity, @race, @ethnicity, @latitude, @longitude, @homelessness_status, @disabilities, @tribal_affiliation, @tribal_enrollment_status, @current_job_title, @current_job_industry, @usual_occupation, @usual_industry, @preferred_language, @pregnancy_status, @rr_id, @processing_status, @eicr_version_number, @authoring_date, @authoring_provider, @provider_id, @facility_id, @facility_name, @encounter_type, @encounter_start_date, @encounter_end_date, @reason_for_visit, @active_problems)",
        );

      if (metadata.patient_addresses) {
        for (const address of metadata.patient_addresses) {
          const patient_address_uuid = randomUUID();
          const addressInsertRequest = new sql.Request(transaction);
          await addressInsertRequest
            .input("UUID", sql.VarChar(200), patient_address_uuid)
            .input("use", sql.VarChar(7), address.use)
            .input("type", sql.VarChar(8), address.type)
            .input("text", sql.VarChar(sql.MAX), address.text)
            .input("line", sql.VarChar(sql.MAX), address.line)
            .input("city", sql.VarChar(255), address.city)
            .input("district", sql.VarChar(255), address.district)
            .input("state", sql.VarChar(255), address.state)
            .input("postal_code", sql.VarChar(20), address.postal_code)
            .input("country", sql.VarChar(255), address.country)
            .input("period_start", sql.DateTime, address.period_start)
            .input("period_end", sql.DateTime, address.period_end)
            .input("eICR_ID", sql.VarChar(200), ecrId)
            .query(
              "INSERT INTO dbo.patient_address (UUID, [use], type, text, line, city, district, state, postal_code, country, period_start, period_end, eICR_ID) VALUES (@UUID, @use, @type, @text, @line, @city, @district, @state, @postal_code, @country, @period_start, @period_end, @eICR_ID)",
            );
        }
      }

      if (metadata.labs) {
        for (const lab of metadata.labs) {
          const labInsertRequest = new sql.Request(transaction);
          await labInsertRequest
            .input("UUID", sql.VarChar(200), lab.uuid)
            .input("eICR_ID", sql.VarChar(200), ecrId)
            .input("test_type", sql.VarChar(200), lab.test_type)
            .input("test_type_code", sql.VarChar(50), lab.test_type_code)
            .input("test_type_system", sql.VarChar(255), lab.test_type_system)
            .input(
              "test_result_qualitative",
              sql.VarChar(sql.MAX),
              lab.test_result_qualitative,
            )
            .input(
              "test_result_quantitative",
              sql.Float,
              lab.test_result_quantitative,
            )
            .input("test_result_units", sql.VarChar(50), lab.test_result_units)
            .input("test_result_code", sql.VarChar(50), lab.test_result_code)
            .input(
              "test_result_code_display",
              sql.VarChar(255),
              lab.test_result_code_display,
            )
            .input(
              "test_result_code_system",
              sql.VarChar(50),
              lab.test_result_code_system,
            )
            .input(
              "test_result_interpretation",
              sql.VarChar(255),
              lab.test_result_interpretation,
            )
            .input(
              "test_result_interpretation_code",
              sql.VarChar(50),
              lab.test_result_interpretation_code,
            )
            .input(
              "test_result_interpretation_system",
              sql.VarChar(255),
              lab.test_result_interpretation_system,
            )
            .input(
              "test_result_ref_range_low_value",
              sql.Float,
              lab.test_result_ref_range_low,
            )
            .input(
              "test_result_ref_range_low_units",
              sql.VarChar(50),
              lab.test_result_ref_range_low_units,
            )
            .input(
              "test_result_ref_range_high_value",
              sql.Float,
              lab.test_result_ref_range_high,
            )
            .input(
              "test_result_ref_range_high_units",
              sql.VarChar(50),
              lab.test_result_ref_range_high_units,
            )
            .input("specimen_type", sql.VarChar(255), lab.specimen_type)
            .input(
              "specimen_collection_date",
              sql.DateTime,
              lab.specimen_collection_date,
            )
            .input("performing_lab", sql.VarChar(255), lab.performing_lab)
            .query(
              "INSERT INTO dbo.ecr_labs VALUES (@UUID, @eICR_ID, @test_type, @test_type_code, @test_type_system, @test_result_qualitative, @test_result_quantitative, @test_result_units, @test_result_code, @test_result_code_display, @test_result_code_system, @test_result_interpretation, @test_result_interpretation_code, @test_result_interpretation_system, @test_result_ref_range_low_value, @test_result_ref_range_low_units, @test_result_ref_range_high_value, @test_result_ref_range_high_units, @specimen_type, @specimen_collection_date, @performing_lab)",
            );
        }
      }

      if (metadata.rr) {
        // Loop through each condition/rule object in rr array
        for (const rrItem of metadata.rr) {
          const rr_conditions_uuid = randomUUID();
          const rrConditionsInsertRequest = new sql.Request(transaction);

          // Insert condition into ecr_rr_conditions
          await rrConditionsInsertRequest
            .input("UUID", sql.VarChar(200), rr_conditions_uuid)
            .input("eICR_ID", sql.VarChar(200), ecrId)
            .input("condition", sql.VarChar(sql.MAX), rrItem.condition)
            .query(
              "INSERT INTO dbo.ecr_rr_conditions VALUES (@UUID, @eICR_ID, @condition)",
            );

          // Loop through the rule summaries array
          if (rrItem.rule_summaries && rrItem.rule_summaries.length > 0) {
            for (const summary of rrItem.rule_summaries) {
              const ruleSummaryInsertRequest = new sql.Request(transaction);

              // Insert each rule summary with reference to the condition
              await ruleSummaryInsertRequest
                .input("UUID", sql.VarChar(200), randomUUID())
                .input(
                  "ECR_RR_CONDITIONS_ID",
                  sql.VarChar(200),
                  rr_conditions_uuid,
                )
                .input("rule_summary", sql.VarChar(sql.MAX), summary.summary)
                .query(
                  "INSERT INTO dbo.ecr_rr_rule_summaries VALUES (@UUID, @ECR_RR_CONDITIONS_ID, @rule_summary)",
                );
            }
          }
        }
      }

      await transaction.commit();

      return {
        message: "Success. Saved metadata to database.",
        status: 200,
      };
    } catch (error: any) {
      console.error({
        message: "Failed to insert metadata to sqlserver.",
        error,
        ecrId,
      });
      // Rollback the transaction if any error occurs
      await transaction.rollback();

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
export const saveMetadataToPostgres = async (
  metadata: BundleMetadata,
  ecrId: string,
): Promise<SaveResponse> => {
  const { database, pgPromise } = getDB();
  const { ParameterizedQuery: PQ } = pgPromise;

  try {
    // Start transaction
    await database.tx(async (t) => {
      // Insert main ECR metadata
      const saveToEcrData = new PQ({
        text: "INSERT INTO ecr_data (eICR_ID, patient_name_last, patient_name_first, patient_birth_date, data_source, report_date, set_id, eicr_version_number) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        values: [
          ecrId,
          metadata.last_name,
          metadata.first_name,
          metadata.birth_date,
          "DB",
          metadata.report_date,
          metadata.eicr_set_id,
          metadata.eicr_version_number,
        ],
      });

      await t.none(saveToEcrData);

      // Loop through each condition/rule object in rr array
      if (metadata.rr && metadata.rr.length > 0) {
        for (const rrItem of metadata.rr) {
          // Insert condition into ecr_rr_conditions
          const saveRRConditions = new PQ({
            text: "INSERT INTO ecr_rr_conditions (uuid, eICR_ID, condition) VALUES (uuid_generate_v4(), $1, $2) RETURNING uuid",
            values: [ecrId, rrItem.condition],
          });

          const savedRRCondition = await t.one(saveRRConditions);

          // Loop through the rule summaries array
          if (rrItem.rule_summaries && rrItem.rule_summaries.length > 0) {
            for (const summaryObj of rrItem.rule_summaries) {
              // Insert each associated summary into ecr_rr_rule_summaries
              const saveRRSummary = new PQ({
                text: "INSERT INTO ecr_rr_rule_summaries (uuid, ecr_rr_conditions_id, rule_summary) VALUES (uuid_generate_v4(), $1, $2)",
                values: [savedRRCondition.uuid, summaryObj.summary],
              });

              await t.none(saveRRSummary);
            }
          }
        }
      }
    });

    // On successful transaction, return response
    return {
      message: "Success. Saved metadata to database.",
      status: 200,
    };
  } catch (error: any) {
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
  const metadataSaveLocation = process.env.METADATA_DATABASE_TYPE;

  try {
    [fhirDataResult, metadataResult] = await Promise.all([
      saveFhirData(fhirBundle, ecrId, saveSource),
      saveFhirMetadata(ecrId, metadataSaveLocation, metadata as BundleMetadata),
    ]);
  } catch (error: any) {
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
