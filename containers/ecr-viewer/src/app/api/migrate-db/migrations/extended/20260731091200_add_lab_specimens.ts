import { Kysely } from "kysely";
import { dbNamespace, dbSchema } from "@/app/data/metadataDb/utils/db-config";

export async function up(db: Kysely<unknown>): Promise<void> {
  if (dbSchema() !== "extended") {
    console.log(`${dbSchema()} schema detected. Skipping extended migration.`);
    return;
  }

  const _db = db.withSchema(dbNamespace());
  await _db.schema
    .createTable("ecr_lab_specimens")
    .addColumn("uuid", "varchar(200)")
    .addColumn("eicr_id", "varchar(200)")
    .addColumn("lab_uuid", "varchar(200)")
    .addColumn("specimen_type", "varchar(255)")
    .addColumn("specimen_collection_date", "date")
    .addPrimaryKeyConstraint("ecr_lab_specimens_pk_uuid_eicr_id", [
      "uuid",
      "eicr_id",
    ])
    .addForeignKeyConstraint(
      "ecr_lab_specimens_fk_eicr_id",
      ["eicr_id"],
      "ecr_data",
      ["eicr_id"],
    )
    .addForeignKeyConstraint(
      "ecr_lab_specimens_fk_lab",
      ["lab_uuid", "eicr_id"],
      "ecr_labs",
      ["uuid", "eicr_id"],
    )
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  if (dbSchema() !== "extended") {
    console.log(`${dbSchema()} schema detected. Skipping extended migration.`);
    return;
  }

  const _db = db.withSchema(dbNamespace());
  await _db.schema.dropTable("ecr_lab_specimens").ifExists().execute();
}
