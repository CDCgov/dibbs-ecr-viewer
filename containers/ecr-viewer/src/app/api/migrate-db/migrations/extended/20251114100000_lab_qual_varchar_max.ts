import { Kysely } from "kysely";

import { AnyDb } from "@/app/data/metadataDb/database";
import { getSql } from "@/app/data/metadataDb/dialects/common";
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
    .alterColumn("test_result_qualitative", (col) =>
      col.setDataType(getSql("maxVarchar"))
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
    .alterColumn("test_result_qualitative", (col) =>
      col.setDataType("varchar(255)")
    )
    .execute();
}
