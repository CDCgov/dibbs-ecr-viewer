import { Kysely, sql } from "kysely";
import { AnyDb, dbNamespace, getTables } from "@/app/data/metadataDb/database";

export async function up(db: Kysely<AnyDb>): Promise<void> {
  const schema = dbNamespace();
  const { ecr_rr_conditions, condition_reference } = getTables(db, schema);

  if (db.dialect.name === "postgres") {
    await db.updateTable(ecr_rr_conditions)
      .set((eb) => ({
        condition_code: eb
          .selectFrom(condition_reference)
          .select(`${condition_reference}.code`)
          .whereRef(`${condition_reference}.condition_name`, "=", `${ecr_rr_conditions}.condition`)
          .limit(1)
      }))
      .where("condition_code", "is", null)
      .execute();
  }
  // For SQL Server
  else if (db.dialect.name === "mssql") {
    // SQL Server requires a slightly different approach for correlated subqueries in UPDATE
    // Instead, we use a CTE for clarity and compatibility
    await sql`
      WITH ConditionCodeLookup AS (
        SELECT 
          erc.uuid,
          cr.code AS new_condition_code
        FROM ${sql.table(ecr_rr_conditions)} erc
        JOIN ${sql.table(condition_reference)} cr ON erc.condition = cr.condition_name
        WHERE erc.condition_code IS NULL
      )
      UPDATE ${sql.table(ecr_rr_conditions)}
      SET condition_code = ccl.new_condition_code
      FROM ${sql.table(ecr_rr_conditions)} erc
      JOIN ConditionCodeLookup ccl ON erc.uuid = ccl.uuid;
    `.execute(db);
  }
}

export async function down(db: Kysely<AnyDb>): Promise<void> {
  const schema = dbNamespace();
  const { ecr_rr_conditions } = getTables(db, schema);

  await db.updateTable(ecr_rr_conditions)
    .set({ condition_code: null })
    .execute();
  console.log("INFO: condition_code in ecr_rr_conditions set to null. Re-run backfill if needed.");
}
