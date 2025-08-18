import { Kysely, sql } from "kysely";

import { AnyDb } from "@/app/data/metadataDb/database";
import { dbDialect, dbNamespace } from "@/app/data/metadataDb/utils/db-config";

/**
 * Alter sql server name columns to support unicode (no matter the collation).
 * @param db - the database connection
 */
export async function up(db: Kysely<AnyDb>): Promise<void> {
  // This migration only applies to sql server
  if (dbDialect() !== "sqlserver") return;

  const schema = dbNamespace();
  const _db = db.withSchema(schema);

  // sql server only allows you to alter one column at a time
  await _db.schema
    .alterTable("ecr_data")
    .alterColumn("first_name", (cb) => cb.setDataType(sql`nvarchar(255)`))
    .execute();

  await _db.schema
    .alterTable("ecr_data")
    .alterColumn("last_name", (cb) => cb.setDataType(sql`nvarchar(255)`))
    .execute();
}

/**
 * Roll back sql server name column unicode support (no matter the collation).
 * @param db - the database connection
 */
export async function down(db: Kysely<AnyDb>): Promise<void> {
  // This migration only applies to sql server
  if (dbDialect() !== "sqlserver") return;

  const _db = db.withSchema(dbNamespace());
  await _db.schema
    .alterTable("ecr_data")
    .alterColumn("last_name", (cb) => cb.setDataType("varchar(255)"))
    .execute();
  await _db.schema
    .alterTable("ecr_data")
    .alterColumn("first_name", (cb) => cb.setDataType("varchar(255)"))
    .execute();
}
