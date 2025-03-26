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
  // Install uuid-ossp extension (Postgres-specific)
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`.execute(db);

  const coreCheck = await db
    .selectFrom("ecr_viewer.ecr_data")
    .select("patient_name_first")
    .executeTakeFirst();

  if (!coreCheck) {
    console.log("Core migration already run. Skipping table creation.");
    return;
  }

  await db.schema
    .alterTable("ecr_viewer.ecr_data")
    .addColumn("data_source", "varchar(2)", (cb) => cb.notNull()) // S3 or DB
    .addColumn("patient_name_first", "varchar(100)")
    .addColumn("patient_name_last", "varchar(100)")
    .addColumn("patient_birth_date", "date")
    .addColumn("report_date", "date", (cb) => cb.notNull())
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
