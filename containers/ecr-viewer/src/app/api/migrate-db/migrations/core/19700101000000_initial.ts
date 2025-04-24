import { Kysely } from "kysely";

import { AnyDb } from "@/app/api/services/database";
import { getSql } from "@/app/api/services/dialects/common";
import { dbNamespace, dbSchema } from "@/app/api/services/utils/db-config";
import { getTable } from "@/app/api/services/utils/db-metadata";

/**
 * Based on ecr-viewer/sql/core.sql.
 * @param db - the database connection
 */
export async function up(db: Kysely<AnyDb>): Promise<void> {
  if (dbSchema() !== "core") {
    console.log(`${dbSchema()} schema detected. Skipping core migration.`);
    return;
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
export async function down(db: Kysely<AnyDb>): Promise<void> {
  const _db = db.withSchema(dbNamespace());
  await _db.schema
    .alterTable("ecr_data")
    .dropColumn("data_source")
    .dropColumn("patient_name_first")
    .dropColumn("patient_name_last")
    .dropColumn("patient_birth_date")
    .dropColumn("report_date")
    .execute();
}
