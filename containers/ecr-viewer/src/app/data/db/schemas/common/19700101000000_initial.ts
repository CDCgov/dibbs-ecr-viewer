import { Kysely } from "kysely";

import { dbNamespace } from "@/app/api/services/database";
import { getSql } from "@/app/api/services/dialects/common";

/**
 * Common schema initialization.
 * @param db - the database connection
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  // Kysely requires <any>
  const schemaExists = await db
    .selectFrom(dbNamespace() + ".ecr_data")
    .selectAll()
    .executeTakeFirst();

  if (schemaExists) {
    console.log(
      "Schema already exists in database. Skipping table creation.",
    );
    return;
  }

  // dbNamespace() since we will be using in test_ev & ecr_viewer?
  try {
    await db.schema.createSchema(dbNamespace()).execute();
  } catch {}

  await db.schema
    .createTable(dbNamespace() + ".ecr_data")
    .addColumn("eicr_id", "varchar(200)", (cb) => cb.primaryKey())
    .addColumn("set_id", "varchar(255)")
    .addColumn("eicr_version_number", "varchar(50)")
    .addColumn("fhir_reference_link", "varchar(255)")
    .addColumn("date_created", getSql("datetimeTzType"), (cb) =>
      cb.notNull().defaultTo(getSql("now")),
    )
    .execute();

  await db.schema
    .createTable(dbNamespace() + ".ecr_rr_conditions")
    .addColumn("uuid", "varchar(200)", (cb) => cb.primaryKey())
    .addColumn("eicr_id", "varchar(255)", (cb) => cb.notNull())
    .addColumn("condition", getSql("maxVarchar"))
    .execute();

  await db.schema
    .createTable(dbNamespace() + ".ecr_rr_rule_summaries")
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
