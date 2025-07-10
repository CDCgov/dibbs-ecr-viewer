import { Kysely } from "kysely";

import { AnyDb } from "@/app/data/metadataDb/database";
import { getSql } from "@/app/data/metadataDb/dialects/common";
import { dbNamespace } from "@/app/data/metadataDb/utils/db-config";

/**
 * Add audit log table.
 * @param db - the database connection
 */
export async function up(db: Kysely<AnyDb>): Promise<void> {
  const schema = dbNamespace();
  const _db = db.withSchema(schema);

  await _db.schema
    .createTable("audit_log")
    .addColumn("uuid", "varchar(200)", (cb) => cb.unique())
    .addColumn("subject", "varchar(200)", (cb) => cb.notNull())
    .addColumn("action", "varchar(200)", (cb) => cb.notNull())
    .addColumn("actor", getSql("maxVarchar"), (cb) => cb.notNull())
    .addColumn("date", getSql("datetimeTzType"), (cb) =>
      cb.notNull().defaultTo(getSql("now")),
    )
    .addColumn("parameter_json", getSql("maxVarchar"), (cb) => cb.notNull())
    .addColumn("metadata_json", getSql("maxVarchar"), (cb) => cb.notNull())
    .addColumn("checksum", getSql("maxVarchar"), (cb) => cb.notNull())
    .addPrimaryKeyConstraint("audit_log_pkey_date_uuid", ["date", "uuid"])
    .execute();
}

/**
 * Roll back audit log table.
 * @param db - the database connection
 */
export async function down(db: Kysely<AnyDb>): Promise<void> {
  const _db = db.withSchema(dbNamespace());
  await _db.schema.dropTable("audit_log").ifExists().execute();
}
