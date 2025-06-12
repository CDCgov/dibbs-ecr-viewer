import { Kysely, sql } from "kysely";

import { AnyDb } from "@/app/data/metadataDb/database";
import {
  dbDialect,
  dbNamespace,
  dbSchema,
} from "@/app/data/metadataDb/utils/db-config";

/**
 * Change the pks to be compound instead of just uuid
 * @param db - the database connection
 */
export async function up(db: Kysely<AnyDb>): Promise<void> {
  if (dbSchema() !== "extended") {
    console.log(`${dbSchema()} schema detected. Skipping extended migration.`);
    return;
  }

  const _db = db.withSchema(dbNamespace());

  for (const table of ["ecr_labs", "patient_address"]) {
    let pkey_name = `${table}_pkey`;

    if (dbDialect() === "sqlserver") {
      // sql server key names are randomized, find it to delete it
      // https://learn.microsoft.com/en-us/sql/relational-databases/tables/delete-primary-keys?view=sql-server-ver17
      const { name } = await db
        .selectFrom("sys.key_constraints")
        .select("name")
        .where("type", "=", "PK")
        .where(sql`OBJECT_NAME(parent_object_id)`, "=", table)
        .executeTakeFirstOrThrow();
      pkey_name = name;
    }

    await _db.schema.alterTable(table).dropConstraint(pkey_name).execute();
    await _db.schema
      .alterTable(table)
      .alterColumn("eicr_id", (cb) => cb.setNotNull())
      .execute();
    await _db.schema
      .alterTable(table)
      .addPrimaryKeyConstraint(`${table}_pk_uuid_eicr_id`, ["uuid", "eicr_id"])
      .execute();
  }
}

/**
 * Remove the compound pks
 * @param db - the database connection
 */
export async function down(db: Kysely<AnyDb>): Promise<void> {
  const _db = db.withSchema(dbNamespace());

  await _db.schema
    .alterTable("ecr_labs")
    .dropConstraint("ecr_labs_pk_uuid_eicr_id")
    .execute();
  await _db.schema
    .alterTable("ecr_lbas")
    .alterColumn("eicr_id", (cb) => cb.dropNotNull())
    .execute();
  await _db.schema
    .alterTable("ecr_labs")
    .addPrimaryKeyConstraint("ecr_labs_pkey", ["uuid"])
    .execute();

  await _db.schema
    .alterTable("patient_address")
    .dropConstraint("patient_address_pk_uuid_eicr_id")
    .execute();
  await _db.schema
    .alterTable("patient_address")
    .alterColumn("eicr_id", (cb) => cb.dropNotNull())
    .execute();
  await _db.schema
    .alterTable("patient_address")
    .addPrimaryKeyConstraint("patient_address_pkey", ["uuid"])
    .execute();
}
