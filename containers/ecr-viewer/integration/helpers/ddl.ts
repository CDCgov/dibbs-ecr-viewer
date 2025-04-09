import { dbNamespace, getDb } from "@/app/api/services/database";
import { getSql } from "@/app/api/services/dialects/common";
import { Common } from "@/app/api/services/types/common";
import { Core } from "@/app/api/services/types/core";
import { Extended } from "@/app/api/services/types/extended";

// Only used in testing, so this is safe to manipulate ENV
const extdb = () => {
  process.env.METADATA_DATABASE_SCHEMA = "extended";
  return getDb<Extended>();
};
const coredb = () => {
  process.env.METADATA_DATABASE_SCHEMA = "core";
  return getDb<Core>();
};

const buildCommon = async () => {
  const db = getDb<Common>();
  // schema creation is in a try catch since it fails if it already exists
  // and `if exists` isn't supported by sql server
  try {
    await db.schema.createSchema(dbNamespace()).execute();
  } catch {}
  await db.schema
    .createTable("ecr_data")
    .addColumn("eicr_id", "varchar(200)", (cb) => cb.primaryKey())
    .addColumn("set_id", "varchar(255)")
    .addColumn("eicr_version_number", "varchar(50)")
    .addColumn("fhir_reference_link", "varchar(255)")
    .addColumn("date_created", getSql("datetimeTzType"), (cb) =>
      cb.notNull().defaultTo(getSql("now")),
    )
    .execute();
  await db.schema
    .createTable("ecr_rr_conditions")
    .addColumn("uuid", "varchar(200)", (cb) => cb.primaryKey())
    .addColumn("eicr_id", "varchar(255)", (cb) => cb.notNull())
    .addColumn("condition", getSql("maxVarchar"))
    .execute();
  await db.schema
    .createTable("ecr_rr_rule_summaries")
    .addColumn("uuid", "varchar(200)", (cb) => cb.primaryKey())
    .addColumn("ecr_rr_conditions_id", "varchar(200)")
    .addColumn("rule_summary", getSql("maxVarchar"))
    .execute();
};

/**
 * Drops the common schema from a test database
 */
const dropCommon = async () => {
  const db = getDb<Common>();
  await db.schema.dropTable("ecr_rr_rule_summaries").ifExists().execute();
  await db.schema.dropTable("ecr_rr_conditions").ifExists().execute();
  await db.schema.dropTable("ecr_data").ifExists().execute();
};

/**
 * Clears the common schema from a test database
 */
const clearCommon = async () => {
  const db = getDb<Common>();
  await db.deleteFrom("ecr_rr_rule_summaries").execute();
  await db.deleteFrom("ecr_rr_conditions").execute();
  await db.deleteFrom("ecr_data").execute();
};

/**
 * Builds the extended schema to a test database
 */
export const buildExtended = async () => {
  await dropExtended();
  await buildCommon();
  await extdb()
    .schema.alterTable("ecr_data")
    .addColumn("last_name", "varchar(255)", (cb) => cb.notNull())
    .addColumn("first_name", "varchar(255)", (cb) => cb.notNull())
    .addColumn("birth_date", "date", (cb) => cb.notNull())
    .addColumn("gender", "varchar(100)")
    .addColumn("birth_sex", "varchar(255)")
    .addColumn("gender_identity", "varchar(255)")
    .addColumn("race", "varchar(255)")
    .addColumn("ethnicity", "varchar(255)")
    .addColumn("latitude", "numeric")
    .addColumn("longitude", "numeric")
    .addColumn("homelessness_status", "varchar(255)")
    .addColumn("disabilities", "varchar(255)")
    .addColumn("tribal_affiliation", "varchar(255)")
    .addColumn("tribal_enrollment_status", "varchar(255)")
    .addColumn("current_job_title", "varchar(255)")
    .addColumn("current_job_industry", "varchar(255)")
    .addColumn("usual_occupation", "varchar(255)")
    .addColumn("usual_industry", "varchar(255)")
    .addColumn("preferred_language", "varchar(255)")
    .addColumn("pregnancy_status", "varchar(255)")
    .addColumn("rr_id", "varchar(255)")
    .addColumn("processing_status", "varchar(255)")
    .addColumn("authoring_date", getSql("datetimeType"))
    .addColumn("authoring_provider", "varchar(255)")
    .addColumn("provider_id", "varchar(255)")
    .addColumn("facility_id", "varchar(255)")
    .addColumn("facility_name", "varchar(255)")
    .addColumn("encounter_type", "varchar(255)")
    .addColumn("encounter_start_date", getSql("datetimeType"))
    .addColumn("encounter_end_date", getSql("datetimeType"))
    .addColumn("reason_for_visit", getSql("maxVarchar"))
    .addColumn("active_problems", getSql("maxVarchar"))
    .execute();
  await extdb()
    .schema.createTable("patient_address")
    .addColumn("uuid", "varchar(200)", (cb) => cb.primaryKey())
    .addColumn("use", "varchar(50)")
    .addColumn("type", "varchar(50)")
    .addColumn("text", "varchar(255)")
    .addColumn("line", "varchar(255)")
    .addColumn("city", "varchar(100)")
    .addColumn("district", "varchar(100)")
    .addColumn("state", "varchar(100)")
    .addColumn("postal_code", "varchar(20)")
    .addColumn("country", "varchar(100)")
    .addColumn("period_start", getSql("datetimeTzType"))
    .addColumn("period_end", getSql("datetimeTzType"))
    .addColumn("eicr_id", "varchar(200)")
    .execute();
  await extdb()
    .schema.createTable("ecr_labs")
    .addColumn("uuid", "varchar(200)", (cb) => cb.primaryKey())
    .addColumn("eicr_id", "varchar(200)")
    .addColumn("test_type", "varchar(255)")
    .addColumn("test_type_code", "varchar(255)")
    .addColumn("test_type_system", "varchar(255)")
    .addColumn("test_result_qualitative", "varchar(255)")
    .addColumn("test_result_quantitative", "numeric")
    .addColumn("test_result_units", "varchar(50)")
    .addColumn("test_result_code", "varchar(255)")
    .addColumn("test_result_code_display", "varchar(255)")
    .addColumn("test_result_code_system", "varchar(255)")
    .addColumn("test_result_interpretation", "varchar(255)")
    .addColumn("test_result_interpretation_code", "varchar(255)")
    .addColumn("test_result_interpretation_system", "varchar(255)")
    .addColumn("test_result_reference_range_low_value", "numeric")
    .addColumn("test_result_reference_range_low_units", "varchar(50)")
    .addColumn("test_result_reference_range_high_value", "numeric")
    .addColumn("test_result_reference_range_high_units", "varchar(50)")
    .addColumn("specimen_type", "varchar(255)")
    .addColumn("specimen_collection_date", "date")
    .addColumn("performing_lab", "varchar(255)")
    .execute();
};

/**
 * Drops the extended schema from a test database
 */
export const dropExtended = async () => {
  await extdb().schema.dropTable("patient_address").ifExists().execute();
  await extdb().schema.dropTable("ecr_labs").ifExists().execute();
  await dropCommon();
};

/**
 * Clears the extended schema tables on a test database
 */
export const clearExtended = async () => {
  await extdb().deleteFrom("patient_address").execute();
  await extdb().deleteFrom("ecr_labs").execute();
  await clearCommon();
};

/**
 * Builds the core schema to a test database
 */
export const buildCore = async () => {
  await dropCore(); // make sure we're starting from scratch
  await buildCommon();

  await coredb()
    .schema.alterTable("ecr_data")
    .addColumn("data_source", "varchar(2)", (cb) => cb.notNull()) // S3 or DB
    .addColumn("patient_name_first", "varchar(100)")
    .addColumn("patient_name_last", "varchar(100)")
    .addColumn("patient_birth_date", "date")
    .addColumn("report_date", "date", (cb) => cb.notNull())
    .execute();
};

/**
 * Drops the core schema from a test database
 */
export const dropCore = dropCommon;

/**
 * Clears the core schema tables on a test database
 */
export const clearCore = clearCommon;
