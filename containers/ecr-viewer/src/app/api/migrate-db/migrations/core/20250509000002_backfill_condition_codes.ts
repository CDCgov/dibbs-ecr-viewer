import { Kysely } from "kysely";
import { AnyDb } from "@/app/data/metadataDb/database";
import { dbDialect, dbNamespace } from "@/app/data/metadataDb/utils/db-config";

export async function up(db: Kysely<AnyDb>): Promise<void> {
  const schema = dbNamespace();
  const _db = db.withSchema(schema);

  if (dbDialect() === "postgres") {
    await _db
      .updateTable("ecr_rr_conditions")
      .set((eb) => ({
        condition_code: eb
          .selectFrom("condition_reference")
          .select("code")
          .whereRef(
            "condition_reference.condition_name",
            "=",
            "ecr_rr_conditions.condition",
          )
          .limit(1),
      }))
      .where("condition_code", "is", null)
      .execute();
  } else if (dbDialect() === "sqlserver") {
    const rows = await _db
      .selectFrom("ecr_rr_conditions as erc")
      .innerJoin(
        "condition_reference as cr",
        "erc.condition",
        "cr.condition_name",
      )
      .select(["erc.uuid", "cr.code as new_code"])
      .where("erc.condition_code", "is", null)
      .execute();

    for (const row of rows) {
      await _db
        .updateTable("ecr_rr_conditions")
        .set({ condition_code: row.new_code })
        .where("uuid", "=", row.uuid)
        .execute();
    }
  }
}

export async function down(db: Kysely<AnyDb>): Promise<void> {
  const schema = dbNamespace();
  const _db = db.withSchema(schema);

  await _db
    .updateTable("ecr_rr_conditions")
    .set({ condition_code: null })
    .execute();
}
