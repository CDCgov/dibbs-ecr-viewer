import { Kysely, sql } from "kysely";

import { AnyDb } from "@/app/data/metadataDb/database";
import { getSql } from "@/app/data/metadataDb/dialects/common";
import { dbDialect, dbNamespace } from "@/app/data/metadataDb/utils/db-config";
import { getTables } from "@/app/data/metadataDb/utils/db-metadata";

/**
 * Core schema initialization.
 * @param db - the database connection
 */
export async function up(db: Kysely<AnyDb>): Promise<void> {
  const schema = dbNamespace();

  if (dbDialect() === "postgres") {
    // Install uuid-ossp extension (Postgres-specific)
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`.execute(db);
  }

  const tables = await getTables(db, schema);
  const tablesExist = [
    "ecr_data",
    "ecr_rr_conditions",
    "ecr_rr_rule_summaries",
  ].every((table) => tables.includes(table));

  if (!tablesExist) {
    const _db = db.withSchema(schema);

    await _db.schema
      .createTable("ecr_data")
      .addColumn("eicr_id", "varchar(200)", (cb) => cb.primaryKey())
      .addColumn("set_id", "varchar(255)")
      .addColumn("eicr_version_number", "varchar(50)")
      .addColumn("fhir_reference_link", "varchar(255)")
      .addColumn("last_name", "varchar(255)", (cb) => cb.notNull())
      .addColumn("first_name", "varchar(255)", (cb) => cb.notNull())
      .addColumn("birth_date", "date", (cb) => cb.notNull())
      .addColumn("encounter_start_date", getSql("datetimeType"))
      .addColumn("date_created", getSql("datetimeTzType"), (cb) =>
        cb.notNull().defaultTo(getSql("now")),
      )
      .execute();

    await _db.schema
      .createTable("ecr_rr_conditions")
      .addColumn("uuid", "varchar(200)", (cb) => cb.primaryKey())
      .addColumn("eicr_id", "varchar(255)", (cb) => cb.notNull())
      .addColumn("condition", getSql("maxVarchar"))
      .execute();

    await _db.schema
      .createTable("ecr_rr_rule_summaries")
      .addColumn("uuid", "varchar(200)", (cb) => cb.primaryKey())
      .addColumn("ecr_rr_conditions_id", "varchar(200)")
      .addColumn("rule_summary", getSql("maxVarchar"))
      .execute();
  }
}

/**
 * Core schema tear down
 * @param db - the database connection
 */
export async function down(db: Kysely<AnyDb>): Promise<void> {
  const _db = db.withSchema(dbNamespace());
  await _db.schema.dropTable("ecr_rr_rule_summaries").ifExists().execute();
  await _db.schema.dropTable("ecr_rr_conditions").ifExists().execute();
  await _db.schema.dropTable("ecr_data").ifExists().execute();
}
