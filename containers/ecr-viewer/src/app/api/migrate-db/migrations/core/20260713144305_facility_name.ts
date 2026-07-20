import { Kysely } from "kysely";

import { AnyDb } from "@/app/data/metadataDb/database";
import { dbNamespace, dbSchema } from "@/app/data/metadataDb/utils/db-config";
import { getTable } from "@/app/data/metadataDb/utils/db-metadata";

/**
 * Add facility name to the core schema.
 * Extended deployments already have this column, so leave it and its data intact.
 * @param db - the database connection
 */
export async function up(db: Kysely<AnyDb>): Promise<void> {
  const schema = dbNamespace();
  const table = await getTable(db, schema, "ecr_data");
  const facilityNameExists = table?.columns.some(
    ({ name }) => name === "facility_name",
  );

  if (facilityNameExists) {
    if (dbSchema() === "extended") {
      console.log(
        "facility_name already exists in the extended schema and is now part of the core schema.",
      );
    }
    return;
  }

  await db
    .withSchema(schema)
    .schema.alterTable("ecr_data")
    .addColumn("facility_name", "varchar(255)")
    .execute();
}

/**
 * Remove facility name from the core schema.
 * Extended deployments owned this column before this migration and must retain it.
 * @param db - the database connection
 */
export async function down(db: Kysely<AnyDb>): Promise<void> {
  if (dbSchema() === "extended") {
    console.log(
      "facility_name remains part of the extended schema and will not be removed.",
    );
    return;
  }

  const schema = dbNamespace();
  const table = await getTable(db, schema, "ecr_data");
  const facilityNameExists = table?.columns.some(
    ({ name }) => name === "facility_name",
  );

  if (!facilityNameExists) return;

  await db
    .withSchema(schema)
    .schema.alterTable("ecr_data")
    .dropColumn("facility_name")
    .execute();
}
