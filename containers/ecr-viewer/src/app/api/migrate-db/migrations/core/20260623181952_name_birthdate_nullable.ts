import { Kysely, sql } from "kysely";

import { AnyDb } from "@/app/data/metadataDb/database";
import {
  dbDialect,
  dbNamespace,
  dbSchema,
} from "@/app/data/metadataDb/utils/db-config";

// kyseley's build in `setNotNull`/`dropNotNull` doesn't work with sql server :(
const sqlServerAlterColumnNull = (
  db: Kysely<AnyDb>,
  column: string,
  column_data_type: string,
  nullable: boolean,
) => {
  return sql`ALTER TABLE ${sql.id(dbNamespace(), "ecr_data")} ALTER COLUMN ${sql.id(column)} ${sql.raw(column_data_type)} ${sql.raw(nullable ? "" : "not")} null`.compile(
    db,
  );
};

/**
 * Make birth_date, first_name, and last_name nullable.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  const _db = db.withSchema(dbNamespace());

  if (dbDialect() === "sqlserver") {
    await _db.executeQuery(
      sqlServerAlterColumnNull(db, "birth_date", "date", true),
    );
    await _db.executeQuery(
      sqlServerAlterColumnNull(db, "first_name", "nvarchar (255)", true),
    );
    await _db.executeQuery(
      sqlServerAlterColumnNull(db, "last_name", "nvarchar (255)", true),
    );
  } else {
    await _db.schema
      .alterTable("ecr_data")
      .alterColumn("birth_date", (cb) => cb.dropNotNull())
      .alterColumn("first_name", (cb) => cb.dropNotNull())
      .alterColumn("last_name", (cb) => cb.dropNotNull())
      .execute();
  }
}

export async function down(db: Kysely<unknown>): Promise<void> {
  const _db = db.withSchema(dbNamespace());

  if (dbDialect() === "sqlserver") {
    await _db.executeQuery(
      sqlServerAlterColumnNull(db, "birth_date", "date", false),
    );
    await _db.executeQuery(
      sqlServerAlterColumnNull(db, "first_name", "nvarchar (255)", false),
    );
    await _db.executeQuery(
      sqlServerAlterColumnNull(db, "last_name", "nvarchar (255)", false),
    );
  } else {
    await _db.schema
      .alterTable("ecr_data")
      .alterColumn("birth_date", (cb) => cb.setNotNull())
      .alterColumn("first_name", (cb) => cb.setNotNull())
      .alterColumn("last_name", (cb) => cb.setNotNull())
      .execute();
  }
}
