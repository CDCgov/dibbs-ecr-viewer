import { Kysely } from "kysely";
import { dbNamespace, dbSchema } from "@/app/data/metadataDb/utils/db-config";
import { getSql, renameColumn } from "@/app/data/metadataDb/dialects/common";

export async function up(db: Kysely<unknown>): Promise<void> {
  if (dbSchema() !== "extended") {
    console.log(`${dbSchema()} schema detected. Skipping extended migration.`);
    return;
  }

  const _db = db.withSchema(dbNamespace());

  await renameColumn(
    db,
    dbNamespace(),
    "ecr_immunizations",
    "administration_date",
    "effective_date",
  );

  await _db.schema
    .alterTable("ecr_immunizations")
    .addColumn("status", "varchar(50)")
    .addColumn("status_reason", getSql("maxVarchar"))
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  if (dbSchema() !== "extended") {
    console.log(`${dbSchema()} schema detected. Skipping extended migration.`);
    return;
  }

  const _db = db.withSchema(dbNamespace());

  await _db.schema
    .alterTable("ecr_immunizations")
    .dropColumn("status_reason")
    .dropColumn("status")
    .execute();

  await renameColumn(
    db,
    dbNamespace(),
    "ecr_immunizations",
    "effective_date",
    "administration_date",
  );
}
