import { Kysely, sql } from "kysely";

import { getSql } from "@/app/api/services/dialects/common";
import { getTable } from "@/app/data/db/utils/db";
import { dbNamespace } from "@/app/data/db/utils/db-config";
import { dbSchema } from "@/app/data/db/utils/db-config";
import { AnyDb } from "@/app/data/db/utils/types";

/**
 * Based on ecr-viewer/sql/core.sql.
 * @param db - the database connection
 */
export async function up(db: Kysely<AnyDb>): Promise<void> {
  if (dbSchema() === "extended") {
    console.log("Extended schema detected. Skipping core migration.");
    return;
  }

  if (process.env.METADATA_DATABASE_TYPE === "postgres") {
    // Install uuid-ossp extension (Postgres-specific)
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`.execute(db);
  }

  const table = await getTable(db, dbNamespace(), "ecr_data");
  const coreCheck =
    !!table && table.columns.some((c) => c.name === "patient_name_first");

  if (coreCheck) {
    console.log("Core migration already run. Skipping table creation.");
    return;
  }

  const _db = db.withSchema(dbNamespace());

  await _db.schema
    .alterTable("ecr_data")
    .addColumn("data_source", "varchar(2)", (cb) => cb.notNull()) // S3 or DB
    .addColumn("patient_name_first", "varchar(100)")
    .addColumn("patient_name_last", "varchar(100)")
    .addColumn("patient_birth_date", getSql("datetimeType"))
    .addColumn("report_date", getSql("datetimeType"), (cb) => cb.notNull())
    .execute();
}

/**
 * Based on ecr-viewer/sql/core.sql.
 * Core schema tear down. This version is hard-coded to the
 * original postgres implementation. Future versions will be
 * database-agnostic.
 * @param db - the database connection
 */
export async function down(db: Kysely<AnyDb>): Promise<void> {
  const _db = db.withSchema(dbNamespace());
  await _db.schema.dropTable("ecr_rr_rule_summaries").ifExists().execute();
  await _db.schema.dropTable("ecr_rr_conditions").ifExists().execute();
  await _db.schema.dropTable("ecr_data").ifExists().execute();
  await _db.schema.dropSchema(dbNamespace()).ifExists().execute();
}
