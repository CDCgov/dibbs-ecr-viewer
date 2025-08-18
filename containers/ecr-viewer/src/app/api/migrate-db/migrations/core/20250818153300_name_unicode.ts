import { Kysely, sql } from "kysely";

import { AnyDb } from "@/app/data/metadataDb/database";
import { dbDialect, dbNamespace } from "@/app/data/metadataDb/utils/db-config";

/**
 * Add condition_code column and foreign key constraint to ecr_rr_conditions, backfill condition codes.
 * @param db - the database connection
 */
export async function up(db: Kysely<AnyDb>): Promise<void> {
  // This migration only applies to sql server
  if (dbDialect() !== "sqlserver") return;

  const schema = dbNamespace();
  const _db = db.withSchema(schema);

  await _db.schema
    .alterTable("ecr_data")
    .alterColumn("first_name", (cb) => cb.setDataType(sql`nvarchar(255)`))
    .alterColumn("last_name", (cb) => cb.setDataType(sql`nvarchar(255)`))
    .execute();
}

/**
 * Roll back condition_code addition to ecr_rr_conditions.
 * @param db - the database connection
 */
export async function down(db: Kysely<AnyDb>): Promise<void> {
  // This migration only applies to sql server
  if (dbDialect() !== "sqlserver") return;

  const _db = db.withSchema(dbNamespace());
  await _db.schema
    .alterTable("ecr_data")
    .alterColumn("first_name", (cb) => cb.setDataType("varchar(255)"))
    .alterColumn("last_name", (cb) => cb.setDataType("varchar(255)"))
    .execute();
}
