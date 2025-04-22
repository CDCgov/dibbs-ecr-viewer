import { Kysely } from "kysely";

import { getSql } from "@/app/api/services/dialects/common";
import { getDbUtils } from "@/app/data/db/utils/db";
import { dbNamespace } from "@/app/data/db/utils/db-config";
import { AnyDb } from "@/app/data/db/utils/types";

/**
 * Common schema initialization.
 * @param db - the database connection
 */
export async function up(db: Kysely<AnyDb>): Promise<void> {
  const schema = dbNamespace();
  const dbUtils = getDbUtils();
  console.log("Initializing common");
  const schemaExists = await dbUtils.schemaExistsByName(db, schema);

  try {
    if (!schemaExists) {
      await db.schema.createSchema(schema).execute(); // first instance of schema mutation
    }
  } catch (error) {
    throw new Error("Failed to create schema or already exists: " + error);
  }

  const tables = await dbUtils.getTables(db, schema);
  const tablesExist = [
    "ecr_data",
    "ecr_rr_conditions",
    "ecr_rr_rule_summaries",
  ].every((table) => tables.includes(table));

  const _db = db.withSchema(schema);

  if (!tablesExist) {
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
  await db.schema.dropSchema(dbNamespace()).ifExists().execute();
}
