// import { Kysely } from "kysely";
import { Kysely } from "kysely";

import { dbNamespace } from "@/app/api/services/database";
import { getSql } from "@/app/api/services/dialects/common";

const schema = dbNamespace();

/**
 * Common schema initialization.
 * @param db - the database connection
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  // Kysely requires <any>
  let result;

  if (process.env.METADATA_DATABASE_SCHEMA === "extended") {
    result = await db
      .selectFrom("sys.schemas")
      .select("name")
      .where("name", "=", schema)
      .executeTakeFirst();
  } else {
    result = await db
      .selectFrom("information_schema.schemata")
      .select("schema_name")
      .where("schema_name", "=", schema)
      .executeTakeFirst();
  }

  console.log("Result: " + result);

  // dbNamespace() since we will be using in test_ev & ecr_viewer?
  try {
    await db.schema.createSchema(schema).execute(); // first instance of schema mutation
  } catch (error) {
    throw new Error("Failed to create schema or already exists: " + error);
  }

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
