import { Kysely } from "kysely";
import { dbSchema } from "@/app/api/services/database";
import { getSql } from "@/app/api/services/dialects/common";

/**
 * Based on ecr-viewer/sql/extended.sql.
 * Extended schema initialization. This version is hard-coded to the
 * original SQL Server implementation. Future versions will be
 * database-agnostic.
 * @param db - the database connection
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  // Kysely requires <any>

  if (dbSchema() === "core") {
    console.log("Core schema detected. Skipping extended migration.");
    return;
  }

  const extendedCheck = await db
    .selectFrom("ecr_viewer.ecr_data")
    .select("patient_name_first")
    .executeTakeFirst();

  if (!extendedCheck) {
    console.log("Extended migration already run. Skipping table creation.");
    return;
  }

  await db.schema
    .alterTable("ecr_viewer.ecr_data")
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

  await db.schema
    .createTable("ecr_viewer.ecr_labs")
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

  await db.schema
    .createTable("ecr_viewer.patient_address")
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
}

/**
 * Based on ecr-viewer/sql/extended.sql.
 * Extended schema tear down. This version is hard-coded to the
 * original SQL Server implementation. Future versions will be
 * database-agnostic.
 * @param db - the database connection
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("ecr_viewer.ecr_labs").ifExists().execute();
  await db.schema
    .dropTable("ecr_viewer.ecr_rr_rule_summaries")
    .ifExists()
    .execute();
  await db.schema
    .dropTable("ecr_viewer.ecr_rr_conditions")
    .ifExists()
    .execute();
  await db.schema.dropTable("ecr_viewer.patient_address").ifExists().execute();
  await db.schema.dropTable("ecr_viewer.ecr_data").ifExists().execute();
  await db.schema.dropSchema("ecr_viewer").ifExists().execute();
}
