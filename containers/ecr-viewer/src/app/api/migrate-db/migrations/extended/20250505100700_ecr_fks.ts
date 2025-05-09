import { Kysely } from "kysely";

import { AnyDb } from "@/app/data/metadataDb/database";
import { dbNamespace } from "@/app/data/metadataDb/utils/db-config";

/**
 * Add fks to extended schema.
 * @param db - the database connection
 */
export async function up(db: Kysely<AnyDb>): Promise<void> {
  const schema = dbNamespace();
  const _db = db.withSchema(schema);

  await _db.schema
    .alterTable("ecr_labs")
    .addForeignKeyConstraint("ecr_labs_fk_eicr_id", ["eicr_id"], "ecr_data", [
      "eicr_id",
    ])
    .execute();

  await _db.schema
    .alterTable("patient_address")
    .addForeignKeyConstraint(
      "patient_address_fk_eicr_id",
      ["eicr_id"],
      "ecr_data",
      ["eicr_id"],
    )
    .execute();
}

/**
 * Remove fks from extended schema
 * @param db - the database connection
 */
export async function down(db: Kysely<AnyDb>): Promise<void> {
  const _db = db.withSchema(dbNamespace());
  await _db.schema
    .alterTable("ecr_labs")
    .dropConstraint("ecr_labs_fk_eicr_id")
    .execute();
  await _db.schema
    .alterTable("patient_address")
    .dropConstraint("patient_address_fk_eicr_id")
    .execute();
}
