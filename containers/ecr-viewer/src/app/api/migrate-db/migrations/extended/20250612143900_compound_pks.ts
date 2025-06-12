import { Kysely } from "kysely";

import { AnyDb } from "@/app/data/metadataDb/database";
import { dbNamespace, dbSchema } from "@/app/data/metadataDb/utils/db-config";

/**
 * Change the pks to be compound instead of just uuid
 * @param db - the database connection
 */
export async function up(db: Kysely<AnyDb>): Promise<void> {
  if (dbSchema() !== "extended") {
    console.log(`${dbSchema()} schema detected. Skipping extended migration.`);
    return;
  }

  const _db = db.withSchema(dbNamespace());

  await _db.schema
    .alterTable("ecr_labs")
    .dropConstraint("ecr_labs_pkey")
    .execute();
  await _db.schema
    .alterTable("ecr_labs")
    .addPrimaryKeyConstraint("ecr_labs_pk_uuid_eicr_id", ["uuid", "eicr_id"])
    .execute();

  await _db.schema
    .alterTable("patient_address")
    .dropConstraint("patient_address_pkey")
    .execute();
  await _db.schema
    .alterTable("patient_address")
    .addPrimaryKeyConstraint("patient_address_pk_uuid_eicr_id", [
      "uuid",
      "eicr_id",
    ])
    .execute();
}

/**
 * Remove the compound pks
 * @param db - the database connection
 */
export async function down(db: Kysely<AnyDb>): Promise<void> {
  const _db = db.withSchema(dbNamespace());

  await _db.schema
    .alterTable("ecr_labs")
    .dropConstraint("ecr_labs_pk_uuid_eicr_id")
    .execute();
  await _db.schema
    .alterTable("ecr_labs")
    .addPrimaryKeyConstraint("ecr_labs_pkey", ["uuid"])
    .execute();

  await _db.schema
    .alterTable("patient_address")
    .dropConstraint("patient_address_pk_uuid_eicr_id")
    .execute();
  await _db.schema
    .alterTable("patient_address")
    .addPrimaryKeyConstraint("patient_address_pkey", ["uuid"])
    .execute();
}
