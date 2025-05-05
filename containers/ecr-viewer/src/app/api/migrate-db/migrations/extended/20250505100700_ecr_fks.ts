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
    .addForeignKeyConstraint("eicr_id_fk", ["eicr_id"], "ecr_data", ["eicr_id"])
    .execute();

  await _db.schema
    .alterTable("patient_address")
    .addForeignKeyConstraint("eicr_id_fk", ["eicr_id"], "ecr_data", ["eicr_id"])
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
    .dropConstraint("eicr_id_fk")
    .execute();
  await _db.schema
    .alterTable("patient_address")
    .dropConstraint("eicr_id_fk")
    .execute();
}
