import { Kysely } from "kysely";
import { dbNamespace, dbSchema } from "@/app/data/metadataDb/utils/db-config";

export async function up(db: Kysely<unknown>): Promise<void> {
  if (dbSchema() !== "extended") {
    console.log(`${dbSchema()} schema detected. Skipping extended migration.`);
    return;
  }

  const _db = db.withSchema(dbNamespace());
  await _db.schema
    .createTable("ecr_immunizations")
    .addColumn("uuid", "varchar(200)", (cb) => cb.primaryKey())
    .addColumn("eicr_id", "varchar(200)")
    .addColumn("name", "varchar(255)")
    .addColumn("administration_date", "date")
    .addForeignKeyConstraint(
      "ecr_immunizations_fk_eicr_id",
      ["eicr_id"],
      "ecr_data",
      ["eicr_id"],
    )
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  const _db = db.withSchema(dbNamespace());
  await _db.schema.dropTable("ecr_immunizations").ifExists().execute();
}
