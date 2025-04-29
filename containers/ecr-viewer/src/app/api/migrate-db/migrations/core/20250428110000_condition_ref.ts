import { Kysely } from "kysely";

import { AnyDb } from "@/app/data/metadataDb/database";
import { dbNamespace } from "@/app/data/metadataDb/utils/db-config";
import { getTables } from "@/app/data/metadataDb/utils/db-metadata";

/**
 * Add user and program area tables.
 * @param db - the database connection
 */
export async function up(db: Kysely<AnyDb>): Promise<void> {
  const schema = dbNamespace();
  const tables = await getTables(db, schema);
  const tableExist = tables.includes("condition_reference");

  // nothing to do here
  if (tableExist) return;

  const _db = db.withSchema(schema);

  await _db.schema
    .createTable("condition_reference")
    .addColumn("code", "varchar(20)", (cb) => cb.primaryKey())
    .addColumn("concept_name", "varchar(200)")
    .addColumn("condition_name", "varchar(200)", (cb) => cb.notNull())
    .addColumn("condition_category", "varchar(200)")
    .addColumn("program_area_uuid", "varchar(200)", (cb) =>
      cb.references("program_area.uuid"),
    )
    .execute();
}

/**
 * Roll back user and program area tables.
 * @param db - the database connection
 */
export async function down(db: Kysely<AnyDb>): Promise<void> {
  const _db = db.withSchema(dbNamespace());
  await _db.schema.dropTable("condition_reference").ifExists().execute();
}
