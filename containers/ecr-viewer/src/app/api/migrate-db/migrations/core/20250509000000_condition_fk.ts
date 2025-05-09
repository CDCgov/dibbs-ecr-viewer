import { Kysely } from "kysely";

import { AnyDb } from "@/app/data/metadataDb/database";
import { dbNamespace } from "@/app/data/metadataDb/utils/db-config";
import { getTable } from "@/app/data/metadataDb/utils/db-metadata";

/**
 * Add condition_code column and foreign key constraint to ecr_rr_conditions.
 * @param db - the database connection
 */
export async function up(db: Kysely<AnyDb>): Promise<void> {
  const schema = dbNamespace();
  const _db = db.withSchema(schema);

  await _db.schema
    .alterTable("ecr_rr_conditions")
    .addColumn("condition_code", "varchar(20)", (cb) =>
      cb.references("condition_reference.code"),
    )
    .execute();

  // data type needs to match referenced column
  await _db.schema
    .alterTable("ecr_rr_conditions")
    .alterColumn("eicr_id", (cb) => cb.setDataType("varchar(200)"))
    .execute();

  await _db.schema
    .alterTable("ecr_rr_conditions")
    .addForeignKeyConstraint(
      "ecr_rr_conditions_fk_eicr_id",
      ["eicr_id"],
      "ecr_data",
      ["eicr_id"],
    )
    .execute();

  await _db.schema
    .alterTable("ecr_rr_rule_summaries")
    .addForeignKeyConstraint(
      "ecr_rr_rule_summaries_fk_ecr_rr_conditions",
      ["ecr_rr_conditions_id"],
      "ecr_rr_conditions",
      ["uuid"],
    )
    .execute();
}

/**
 * Roll back condition_code addition to ecr_rr_conditions.
 * @param db - the database connection
 */
export async function down(db: Kysely<AnyDb>): Promise<void> {
  const _db = db.withSchema(dbNamespace());
  await _db.schema
    .alterTable("ecr_rr_conditions")
    .dropColumn("condition_code")
    .execute();
  await _db.schema
    .alterTable("ecr_rr_rule_summaries")
    .dropConstraint("ecr_rr_rule_summaries_fk_ecr_rr_conditions")
    .execute();
  await _db.schema
    .alterTable("ecr_rr_conditions")
    .dropConstraint("ecr_rr_conditions_fk_eicr_id")
    .execute();
}
