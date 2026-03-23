import { Kysely } from "kysely";

import { AnyDb } from "@/app/data/metadataDb/database";
import { dbNamespace, dbSchema } from "@/app/data/metadataDb/utils/db-config";
import { getTable } from "@/app/data/metadataDb/utils/db-metadata";

/**
 * Add EHR and Immunization related columns to extended schema
 * @param db - the database connection
 */
export async function up(db: Kysely<AnyDb>): Promise<void> {
  if (dbSchema() !== "extended") {
    console.log(`${dbSchema()} schema detected. Skipping extended migration.`);
    return;
  }

  const _db = db.withSchema(dbNamespace());
  await _db.schema
    .alterTable("ecr_data")
    .addColumn("ehr_software", "varchar(255)")
    .addColumn("ehr_manufacturer_model", "varchar(255)")
    .execute();
}

/**
 * Drop EHR and Immunization related columns to extended schema
 * @param db - the database connection
 */
export async function down(db: Kysely<AnyDb>): Promise<void> {
  const _db = db.withSchema(dbNamespace());
  await _db.schema
    .alterTable("ecr_data")
    .dropColumn("ehr_software")
    .dropColumn("ehr_manufacturer_model")
    .execute();
}
