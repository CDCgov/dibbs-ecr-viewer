import { CompiledQuery, Kysely } from "kysely";

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

  // sql server only allows you to alter one column at a time and requires the full definition
  // kysely only allows you to alter one thing about a column at a time
  // these do not play well together...
  await db.executeQuery(
    CompiledQuery.raw(
      `ALTER TABLE [${schema}].[ecr_data] ALTER COLUMN first_name nvarchar(255) NOT NULL`,
    ),
  );
  await db.executeQuery(
    CompiledQuery.raw(
      `ALTER TABLE [${schema}].[ecr_data] ALTER COLUMN last_name nvarchar(255) NOT NULL`,
    ),
  );
}

/**
 * Roll back sql server name column unicode support (no matter the collation).
 * @param db - the database connection
 */
export async function down(db: Kysely<AnyDb>): Promise<void> {
  // This migration only applies to sql server
  if (dbDialect() !== "sqlserver") return;

  const schema = dbNamespace();
  await db.executeQuery(
    CompiledQuery.raw(
      `ALTER TABLE [${schema}].[ecr_data] ALTER COLUMN first_name varchar(255) NOT NULL`,
    ),
  );
  await db.executeQuery(
    CompiledQuery.raw(
      `ALTER TABLE [${schema}].[ecr_data] ALTER COLUMN last_name varchar(255) NOT NULL`,
    ),
  );
}
