import { Kysely } from "kysely";

import { AnyDb } from "@/app/data/metadataDb/database";
import { dbNamespace, dbDialect } from "@/app/data/metadataDb/utils/db-config";

/**
 * Add condition_code column and foreign key constraint to ecr_rr_conditions, backfill condition codes.
 * @param db - the database connection
 */
export async function up(db: Kysely<AnyDb>): Promise<void> {
  const schema = dbNamespace();
  const _db = db.withSchema(schema);

  await _db.schema
    .alterTable("ecr_rr_conditions")
    .addColumn("condition_code", "varchar(20)")
    .execute();

  // Backfill condition_code for existing records
  const rows = await _db
    .selectFrom("ecr_rr_conditions as erc")
    .innerJoin(
      "condition_reference as cr",
      "erc.condition",
      "cr.condition_name",
    )
    .select(["erc.uuid", "cr.code as new_code"])
    .where("erc.condition_code", "is", null)
    .execute();
  for (const row of rows) {
    await _db
      .updateTable("ecr_rr_conditions")
      .set({ condition_code: row.new_code })
      .where("uuid", "=", row.uuid)
      .execute();
  }
}

/**
 * Roll back condition_code addition to ecr_rr_conditions.
 * @param db - the database connection
 */
export async function down(db: Kysely<AnyDb>): Promise<void> {
  const _db = db.withSchema(dbNamespace());
  await _db.schema
    .alterTable("ecr_rr_conditions")
    .dropConstraint("ecr_rr_conditions_fk_condition_code")
    .execute();
  await _db.schema
    .alterTable("ecr_rr_conditions")
    .dropColumn("condition_code")
    .execute();
}
