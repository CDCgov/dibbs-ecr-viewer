import { Kysely } from "kysely";

import { AnyDb } from "@/app/data/metadataDb/database";
import { dbNamespace } from "@/app/data/metadataDb/utils/db-config";

/**
 * Add fks to core schema.
 * @param db - the database connection
 */
export async function up(db: Kysely<AnyDb>): Promise<void> {
  const schema = dbNamespace();
  const _db = db.withSchema(schema);

  await _db.schema
    .alterTable("ecr_rr_conditions")
    .addForeignKeyConstraint("eicr_id_fk", ["eicr_id"], "ecr_data", ["eicr_id"])
    .execute();

  await _db.schema
    .alterTable("ecr_rr_rule_summaries")
    .addForeignKeyConstraint(
      "ecr_rr_conditions_id_fk",
      ["ecr_rr_conditions_id"],
      "ecr_rr_conditions",
      ["uuid"],
    )
    .execute();
}

/**
 * Remove fks from core schema
 * @param db - the database connection
 */
export async function down(db: Kysely<AnyDb>): Promise<void> {
  const _db = db.withSchema(dbNamespace());
  await _db.schema
    .alterTable("ecr_rr_rule_summaries")
    .dropConstraint("ecr_rr_conditions_id_fk")
    .execute();
  await _db.schema
    .alterTable("ecr_rr_conditions")
    .dropConstraint("eicr_id_fk")
    .execute();
}
