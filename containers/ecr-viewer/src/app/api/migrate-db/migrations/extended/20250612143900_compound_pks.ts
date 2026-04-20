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
  table: string,
  nullable: boolean,
) => {
  return sql`alter table ${sql.id(dbNamespace(), table)} alter column "eicr_id" varchar(200) ${sql.raw(nullable ? "" : "not")} null`.compile(
    db,
  );
};

/**
 * Change the pks to be compound instead of just uuid.
 *
 * Why the schema filter was added to the SQL Server key constraint lookup:
 * `sys.key_constraints` is a server-wide view, so querying by table name alone
 * can return matching constraints from multiple schemas. SQL Server generates constraint
 * names randomly, so collisions across schemas are intermittent, the e2e tests
 * would only fail sometimes, and the migration would need to be re-run
 * repeatedly until SQL Server happened to generate unique names.
 *
 * This migration is updated in place (instead of creating a new one) since 
 * Kysely records which migration files have already been applied by filename
 * and environments that already ran it have the correct state and will not re-run
 * it. The change only affects new environments or test runs initialized from
 * scratch.
 *
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
        .where(sql`OBJECT_SCHEMA_NAME(parent_object_id)`, "=", dbNamespace())
        .executeTakeFirstOrThrow();
      pkey_name = name;

      await _db.executeQuery(sqlServerAlterColumnNull(db, table, false));
    } else {
      await _db.schema
        .alterTable(table)
        .alterColumn("eicr_id", (cb) => cb.setNotNull())
        .execute();
    }

    await _db.schema.alterTable(table).dropConstraint(pkey_name).execute();
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

  for (const table of ["ecr_labs", "patient_address"]) {
    await _db.schema
      .alterTable(table)
      .dropConstraint(`${table}_pk_uuid_eicr_id`)
      .execute();
    if (dbDialect() === "sqlserver") {
      await _db.executeQuery(sqlServerAlterColumnNull(db, table, true));
    } else {
      await _db.schema
        .alterTable(table)
        .alterColumn("eicr_id", (cb) => cb.dropNotNull())
        .execute();
    }
    await _db.schema
      .alterTable(table)
      .addPrimaryKeyConstraint(`${table}_pkey`, ["uuid"])
      .execute();
  }
}
