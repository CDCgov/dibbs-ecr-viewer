import { Kysely } from "kysely";

import { AnyDb } from "@/app/data/metadataDb/database";
import { getSql } from "@/app/data/metadataDb/dialects/common";
import { dbNamespace } from "@/app/data/metadataDb/utils/db-config";

/**
 * Expand ethnicity column length to varchar(max).
 * @param db - the database connection
 */
export async function up(db: Kysely<AnyDb>): Promise<void> {
  const schema = dbNamespace();
  const _db = db.withSchema(schema);

  await _db.schema
    .alterTable("ecr_data")
    .alterColumn("ethnicity", (col) => col.setDataType(getSql("maxVarchar")))
    .execute();
}

/**
 * Reduce ethnicity column length to varchar(255)
 * @param db - the database connection
 */
export async function down(db: Kysely<AnyDb>): Promise<void> {
  const _db = db.withSchema(dbNamespace());
  await _db.schema
    .alterTable("ecr_data")
    .alterColumn("ethnicity", (col) => col.setDataType("varchar(255)"))
    .execute();
}
