import { Kysely, sql } from "kysely";

import { AnyDb } from "@/app/api/services/database";
import { getSql } from "@/app/api/services/dialects/common";
import { dbDialect, dbNamespace } from "@/app/api/services/utils/db-config";
import {
  schemaExistsByName,
  getTables,
} from "@/app/api/services/utils/db-metadata";

/**
 * Common schema initialization.
 * @param db - the database connection
 */
export async function up(db: Kysely<AnyDb>): Promise<void> {
  const schema = dbNamespace();
  const schemaExists = await schemaExistsByName(db, schema);

  try {
    if (!schemaExists) {
      await db.schema.createSchema(schema).execute(); // first instance of schema mutation
    }
  } catch (error) {
    throw new Error("Failed to create schema or already exists: " + error);
  }

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
 * Common schema initialization.
 * @param db - the database connection
 */
export async function down(db: Kysely<AnyDb>): Promise<void> {
  const _db = db.withSchema(dbNamespace());
  await _db.schema.dropTable("ecr_rr_rule_summaries").ifExists().execute();
  await _db.schema.dropTable("ecr_rr_conditions").ifExists().execute();
  await _db.schema.dropTable("ecr_data").ifExists().execute();
  await _db.schema.dropSchema(dbNamespace()).ifExists().execute();
}
