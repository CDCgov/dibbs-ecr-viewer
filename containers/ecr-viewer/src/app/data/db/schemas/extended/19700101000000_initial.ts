import { Kysely, sql } from "kysely";

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
  // Check if schema exists in SQL Server
  const schemaExists = await db
    .selectFrom("sys.schemas")
    .select("name")
    .where("name", "=", "ecr_viewer")
    .executeTakeFirst();

  if (schemaExists) {
    console.log(
      "Schema ecr_viewer already exists in extended database. Skipping table creation.",
    );
    return;
  }

  // Create the schema
  await db.schema.createSchema("ecr_viewer").execute();

  // Create tables (example structure; adjust as needed)
  await db.schema
    .createTable("ecr_viewer.ecr_data")
    .addColumn("eICR_ID", "varchar(200)", (col) => col.primaryKey())
    .addColumn("set_id", "varchar(255)")
    .addColumn("fhir_reference_link", "varchar(255)")
    .addColumn("last_name", "varchar(255)")
    .addColumn("first_name", "varchar(255)")
    .addColumn("birth_date", "date")
    .addColumn("gender", "varchar(50)")
    .addColumn("birth_sex", "varchar(50)")
    .addColumn("gender_identity", "varchar(50)")
    .addColumn("race", "varchar(255)")
    .addColumn("ethnicity", "varchar(255)")
    .addColumn("latitude", sql`float`)
    .addColumn("longitude", sql`float`)
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
    .addColumn("eicr_version_number", "varchar(50)")
    .addColumn("authoring_date", "datetime")
    .addColumn("authoring_provider", "varchar(255)")
    .addColumn("provider_id", "varchar(255)")
    .addColumn("facility_id", "varchar(255)")
    .addColumn("facility_name", "varchar(255)")
    .addColumn("encounter_type", "varchar(255)")
    .addColumn("encounter_start_date", "datetime")
    .addColumn("encounter_end_date", "datetime")
    .addColumn("reason_for_visit", sql`varchar(max)`)
    .addColumn("active_problems", sql`varchar(max)`)
    .addColumn("date_created", sql`datetimeoffset`, (col) =>
      col.notNull().defaultTo(sql`SYSDATETIMEOFFSET()`),
    )
    .execute();

  await db.schema
    .createTable("ecr_viewer.ecr_rr_conditions")
    .addColumn("UUID", "varchar(200)", (col) => col.primaryKey())
    .addColumn("eICR_ID", "varchar(200)", (col) =>
      col.notNull().references("ecr_viewer.ecr_data.eICR_ID"),
    )
    .addColumn("condition", sql`nvarchar(255)`)
    .execute();

  await db.schema
    .createTable("ecr_viewer.ecr_rr_rule_summaries")
    .addColumn("UUID", "varchar(200)", (col) => col.primaryKey())
    .addColumn("ECR_RR_CONDITIONS_ID", "varchar(200)", (col) =>
      col.references("ecr_viewer.ecr_rr_conditions.UUID"),
    )
    .addColumn("rule_summary", sql`varchar(max)`)
    .execute();

  await db.schema
    .createTable("ecr_viewer.ecr_labs")
    .addColumn("UUID", "varchar(200)")
    .addColumn("eICR_ID", "varchar(200)", (col) =>
      col.references("ecr_viewer.ecr_data.eICR_ID"),
    )
    .addColumn("test_type", "varchar(255)")
    .addColumn("test_type_code", "varchar(50)")
    .addColumn("test_type_system", "varchar(255)")
    .addColumn("test_result_qualitative", sql`varchar(max)`)
    .addColumn("test_result_quantitative", sql`float`)
    .addColumn("test_result_units", "varchar(50)")
    .addColumn("test_result_code", "varchar(50)")
    .addColumn("test_result_code_display", "varchar(255)")
    .addColumn("test_result_code_system", "varchar(50)")
    .addColumn("test_result_interpretation", "varchar(255)")
    .addColumn("test_result_interpretation_code", "varchar(50)")
    .addColumn("test_result_interpretation_system", "varchar(255)")
    .addColumn("test_result_reference_range_low_value", sql`float`)
    .addColumn("test_result_reference_range_low_units", "varchar(50)")
    .addColumn("test_result_reference_range_high_value", sql`float`)
    .addColumn("test_result_reference_range_high_units", "varchar(50)")
    .addColumn("specimen_type", "varchar(255)")
    .addColumn("specimen_collection_date", "date")
    .addColumn("performing_lab", "varchar(255)")
    .addPrimaryKeyConstraint("ecr_labs_pk", ["UUID", "eICR_ID"])
    .execute();

  await db.schema
    .createTable("ecr_viewer.patient_address")
    .addColumn("UUID", "varchar(200)", (col) => col.primaryKey())
    .addColumn("use", "varchar(7)")
    .addColumn("type", "varchar(8)")
    .addColumn("text", sql`varchar(max)`)
    .addColumn("line", "varchar(255)")
    .addColumn("city", "varchar(255)")
    .addColumn("district", "varchar(255)")
    .addColumn("state", "varchar(255)")
    .addColumn("postal_code", "varchar(20)")
    .addColumn("country", "varchar(255)")
    .addColumn("period_start", sql`datetimeoffset`)
    .addColumn("period_end", sql`datetimeoffset`)
    .addColumn("eICR_ID", "varchar(200)", (col) =>
      col.references("ecr_viewer.ecr_data.eICR_ID"),
    )
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
  // Drop tables and schema only if they exist
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
