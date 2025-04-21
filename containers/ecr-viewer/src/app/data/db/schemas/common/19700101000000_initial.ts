import { Kysely } from "kysely";

import { getSql } from "../../../../api/services/dialects/common";
import { dbNamespace, getDbUtils } from "../../utils";

const schema = dbNamespace();
const dbUtils = getDbUtils();

/**
 * Common schema initialization.
 * @param db - the database connection
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  // Kysely requires <any>
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

  if (!tablesExist) {
    await db.schema
      .createTable(schema + ".ecr_data")
      .addColumn("eicr_id", "varchar(200)", (cb) => cb.primaryKey())
      .addColumn("set_id", "varchar(255)")
      .addColumn("eicr_version_number", "varchar(50)")
      .addColumn("fhir_reference_link", "varchar(255)")
      .addColumn("date_created", getSql("datetimeTzType"), (cb) =>
        cb.notNull().defaultTo(getSql("now")),
      )
      .execute();

    await db.schema
      .createTable(schema + ".ecr_rr_conditions")
      .addColumn("uuid", "varchar(200)", (cb) => cb.primaryKey())
      .addColumn("eicr_id", "varchar(255)", (cb) => cb.notNull())
      .addColumn("condition", getSql("maxVarchar"))
      .execute();

    await db.schema
      .createTable(schema + ".ecr_rr_rule_summaries")
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .dropTable(schema + ".ecr_rr_rule_summaries")
    .ifExists()
    .execute();
  await db.schema
    .dropTable(schema + ".ecr_rr_conditions")
    .ifExists()
    .execute();
  await db.schema
    .dropTable(schema + ".ecr_data")
    .ifExists()
    .execute();
  await db.schema.dropSchema(dbNamespace()).ifExists().execute();
}
