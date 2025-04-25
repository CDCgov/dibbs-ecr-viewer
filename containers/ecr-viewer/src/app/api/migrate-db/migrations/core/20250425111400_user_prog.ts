import { Kysely } from "kysely";

import { AnyDb } from "@/app/data/metadataDb/database";
import { getSql } from "@/app/data/metadataDb/dialects/common";
import { dbNamespace } from "@/app/data/metadataDb/utils/db-config";
import { getTables } from "@/app/data/metadataDb/utils/db-metadata";

/**
 * Add user and program area tables.
 * @param db - the database connection
 */
export async function up(db: Kysely<AnyDb>): Promise<void> {
  const schema = dbNamespace();
  const tables = await getTables(db, schema);
  const tablesExist = ["user", "program_area", "user_program_area"].every(
    (table) => tables.includes(table),
  );

  if (!tablesExist) {
    const _db = db.withSchema(schema);

    await _db.schema
      .createTable("user")
      .addColumn("uuid", "varchar(200)", (cb) => cb.primaryKey())
      .addColumn("email", "varchar(200)", (cb) => cb.notNull().unique())
      .addColumn("name", "varchar(200)")
      .addColumn("date_of_last_login", getSql("datetimeTzType"))
      .addColumn("user_type", "varchar(12)", (cb) => cb.notNull())
      .addColumn("user_status", "varchar(12)", (cb) =>
        cb.notNull().defaultTo("active"),
      )
      .addColumn("date_created", getSql("datetimeTzType"), (cb) =>
        cb.notNull().defaultTo(getSql("now")),
      )
      .addColumn("author_uuid", "varchar(200)", (cb) =>
        cb.references("user.uuid"),
      )
      .execute();

    await _db.schema
      .createTable("program_area")
      .addColumn("uuid", "varchar(200)", (cb) => cb.primaryKey())
      .addColumn("name", "varchar(200)", (cb) => cb.notNull().unique())
      .addColumn("date_created", getSql("datetimeTzType"), (cb) =>
        cb.notNull().defaultTo(getSql("now")),
      )
      .addColumn("author_uuid", "varchar(200)", (cb) =>
        cb.notNull().references("user.uuid"),
      )
      .execute();

    await _db.schema
      .createTable("user_program_area")
      .addColumn("user_uuid", "varchar(200)", (cb) =>
        cb.notNull().references("user.uuid"),
      )
      .addColumn("program_area_uuid", "varchar(200)", (cb) =>
        cb.notNull().references("program_area.uuid"),
      )
      .addPrimaryKeyConstraint("primary_key", [
        "user_uuid",
        "program_area_uuid",
      ])
      .execute();
  }
}

/**
 * Roll back user and program area tables.
 * @param db - the database connection
 */
export async function down(db: Kysely<AnyDb>): Promise<void> {
  const _db = db.withSchema(dbNamespace());
  await _db.schema.dropTable("user_program_area").ifExists().execute();
  await _db.schema.dropTable("program_area").ifExists().execute();
  await _db.schema.dropTable("user").ifExists().execute();
}
