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
  const table = await getTable(db, dbNamespace(), "ecr_rr_conditions");

  const foreignKeyCheck =
    !!table && table.columns.some((c) => c.name === "condition_code");

  if (foreignKeyCheck) return;

  const _db = db.withSchema(schema);

  await _db.schema
    .alterTable("ecr_rr_conditions")
    .addColumn("condition_code", "varchar(20)", (cb) =>
      cb.references("condition_reference.code"),
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
}
