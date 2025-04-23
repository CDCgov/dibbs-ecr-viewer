import { Kysely } from "kysely";

import { getSql } from "@/app/api/services/dialects/common";
import { getTable } from "@/app/data/db/utils/db";
import { dbNamespace } from "@/app/data/db/utils/db-config";
import { dbSchema } from "@/app/data/db/utils/db-config";
import { AnyDb } from "@/app/data/db/utils/types";

/**
 * Based on ecr-viewer/sql/extended.sql.
 * @param db - the database connection
 */
export async function up(db: Kysely<AnyDb>): Promise<void> {
  if (dbSchema() !== "extended") {
    console.log(`${dbSchema()} schema detected. Skipping extended migration.`);
    return;
  }

  const table = await getTable(db, dbNamespace(), "ecr_data");
  const extendedCheck =
    !!table && table.columns.some((c) => c.name === "first_name");

  if (extendedCheck) {
    console.log("Extended migration already run. Skipping table creation.");
    return;
  }

  const _db = db.withSchema(dbNamespace());

  await _db.schema
    .alterTable("ecr_data")
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

  await _db.schema
    .createTable("ecr_labs")
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

  await _db.schema
    .createTable("patient_address")
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
export async function down(db: Kysely<AnyDb>): Promise<void> {
  const _db = db.withSchema(dbNamespace());
  await _db.schema.dropTable("ecr_labs").ifExists().execute();
  await _db.schema.dropTable("patient_address").ifExists().execute();
  await _db.schema
    .alterTable("ecr_data")
    .dropColumn("last_name")
    .dropColumn("first_name")
    .dropColumn("birth_date")
    .dropColumn("gender")
    .dropColumn("birth_sex")
    .dropColumn("gender_identity")
    .dropColumn("race")
    .dropColumn("ethnicity")
    .dropColumn("latitude")
    .dropColumn("longitude")
    .dropColumn("homelessness_status")
    .dropColumn("disabilities")
    .dropColumn("tribal_affiliation")
    .dropColumn("tribal_enrollment_status")
    .dropColumn("current_job_title")
    .dropColumn("current_job_industry")
    .dropColumn("usual_occupation")
    .dropColumn("usual_industry")
    .dropColumn("preferred_language")
    .dropColumn("pregnancy_status")
    .dropColumn("rr_id")
    .dropColumn("processing_status")
    .dropColumn("authoring_date")
    .dropColumn("authoring_provider")
    .dropColumn("provider_id")
    .dropColumn("facility_id")
    .dropColumn("facility_name")
    .dropColumn("encounter_type")
    .dropColumn("encounter_start_date")
    .dropColumn("encounter_end_date")
    .dropColumn("reason_for_visit")
    .dropColumn("active_problems")
    .execute();
}
