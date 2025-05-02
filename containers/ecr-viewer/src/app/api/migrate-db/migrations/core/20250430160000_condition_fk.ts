import { Kysely, sql } from "kysely";

import { AnyDb } from "@/app/data/metadataDb/database";
import { dbNamespace, dbDialect } from "@/app/data/metadataDb/utils/db-config";
import { getTable } from "@/app/data/metadataDb/utils/db-metadata";

/**
 * Add condition_code column and foreign key constraint to ecr_rr_conditions.
 * @param db - the database connection
 */
export async function up(db: Kysely<AnyDb>): Promise<void> {
  const schema = dbNamespace();
  const table = await getTable(db, dbNamespace(), "ecr_rr_conditions");

  const foreignKeyCheck =
    !!table && table.columns.some((c) => c.name === "condition_code");

  if (foreignKeyCheck) return;

  const _db = db.withSchema(schema);

  await _db.schema
    .alterTable("ecr_rr_conditions")
    .addColumn("condition_code", "varchar(20)", (cb) =>
      cb.references("condition_reference.code"),
    )
    .execute();

  if (dbDialect() === "postgres") {
    await sql`
      CREATE OR REPLACE FUNCTION set_condition_code()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.condition_code IS NULL THEN
          SELECT code INTO NEW.condition_code
          FROM ${sql.raw(schema)}.condition_reference
          WHERE condition_reference.condition_name = NEW.condition
          LIMIT 1;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `.execute(_db);

    await sql`
      CREATE TRIGGER trg_set_condition_code
      BEFORE INSERT ON ${sql.raw(schema)}.ecr_rr_conditions
      FOR EACH ROW
      EXECUTE FUNCTION set_condition_code();
    `.execute(_db);
  } else if (dbDialect() === "sqlserver") {
    await sql`      
      CREATE TRIGGER trg_set_condition_code
      ON [${sql.raw(schema)}].[ecr_rr_conditions]
      INSTEAD OF INSERT
      AS
      BEGIN
        INSERT INTO [${sql.raw(
          schema,
        )}].[ecr_rr_conditions] (uuid, eicr_id, condition, condition_code)
        SELECT 
          i.uuid,
          i.eicr_id,
          i.condition,
          COALESCE(i.condition_code, cr.code)
        FROM inserted i
        LEFT JOIN [${sql.raw(schema)}].[condition_reference] cr
          ON cr.condition_name = i.condition;
      END;
    `.execute(_db);
  } else {
    throw new Error("Unsupported database dialect for trigger creation.");
  }
}

/**
 * Roll back condition_code addition to ecr_rr_conditions.
 * @param db - the database connection
 */
export async function down(db: Kysely<AnyDb>): Promise<void> {
  const _db = db.withSchema(dbNamespace());
  await _db.schema
    .alterTable("ecr_rr_conditions")
    .dropColumn("condition_code")
    .execute();
}
