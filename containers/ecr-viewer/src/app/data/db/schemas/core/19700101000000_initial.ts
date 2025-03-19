import { Kysely, sql } from "kysely";

/**
 * Based on ecr-viewer/sql/core.sql.
 * Core schema initialization. This version is hard-coded to the
 * original postgres implementation. Future versions will be
 * database-agnostic.
 * @param db - the database connection
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  // Kysely requires <any>
  // Check if schema exists in Postgres
  const schemaExists = await db
    .selectFrom("information_schema.schemata")
    .select("schema_name")
    .where("schema_name", "=", "ecr_viewer")
    .executeTakeFirst();

  if (schemaExists) {
    console.log(
      "Schema ecr_viewer already exists in core database. Skipping table creation.",
    );
    return;
  }

  // Create the schema
  await db.schema.createSchema("ecr_viewer").execute();

  // Install uuid-ossp extension (Postgres-specific)
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`.execute(db);

  // Create tables (example structure; adjust as needed)
  await db.schema
    .createTable("ecr_viewer.ecr_data")
    .addColumn("eICR_ID", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`uuid_generate_v4()`),
    )
    .addColumn("set_id", "varchar(50)")
    .addColumn("eicr_version_number", "varchar(50)")
    .addColumn("data_source", "varchar(2)")
    .addColumn("fhir_reference_link", "varchar(500)")
    .addColumn("patient_name_first", "varchar(100)")
    .addColumn("patient_name_last", "varchar(100)")
    .addColumn("patient_birth_date", "datetime")
    .addColumn("date_created", "timestamp", (col) =>
      col.notNull().defaultTo(new Date()),
    )
    .addColumn("report_date", "datetime")
    .execute();

  await db.schema
    .createTable("ecr_viewer.ecr_rr_conditions")
    .addColumn("uuid", "varchar(200)", (col) => col.primaryKey())
    .addColumn("eICR_ID", "varchar(200)", (col) =>
      col.notNull().references("ecr_viewer.ecr_data.eICR_ID"),
    )
    .addColumn("condition", "varchar")
    .execute();

  await db.schema
    .createTable("ecr_viewer.ecr_rr_rule_summaries")
    .addColumn("uuid", "varchar(200)", (col) => col.primaryKey())
    .addColumn("ecr_rr_conditions_id", "varchar(200)", (col) =>
      col.references("ecr_viewer.ecr_rr_conditions.uuid"),
    )
    .addColumn("rule_summary", "varchar")
    .execute();
}

/**
 * Based on ecr-viewer/sql/core.sql.
 * Core schema tear down. This version is hard-coded to the
 * original postgres implementation. Future versions will be
 * database-agnostic.
 * @param db - the database connection
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  // Kysely requires <any>
  // Drop tables and schema only if they exist
  await db.schema
    .dropTable("ecr_viewer.ecr_rr_rule_summaries")
    .ifExists()
    .execute();
  await db.schema
    .dropTable("ecr_viewer.ecr_rr_conditions")
    .ifExists()
    .execute();
  await db.schema.dropTable("ecr_viewer.ecr_data").ifExists().execute();
  await db.schema.dropSchema("ecr_viewer").ifExists().execute();
}
