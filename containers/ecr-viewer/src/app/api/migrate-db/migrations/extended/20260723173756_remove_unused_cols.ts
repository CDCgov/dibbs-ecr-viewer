import { Kysely } from "kysely";
import { dbNamespace, dbSchema } from "@/app/data/metadataDb/utils/db-config";

export async function up(db: Kysely<unknown>): Promise<void> {
  if (dbSchema() !== "extended") {
    console.log(`${dbSchema()} schema detected. Skipping extended migration.`);
    return;
  }

  const _db = db.withSchema(dbNamespace());

  await _db.schema
    .alterTable("ecr_data")
    .dropColumn("latitude")
    .dropColumn("longitude")
    .dropColumn("rr_id")
    .dropColumn("disabilities")
    .execute();

  await _db.schema
    .alterTable("patient_address")
    .dropColumn("type")
    .dropColumn("text")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  if (dbSchema() !== "extended") {
    console.log(`${dbSchema()} schema detected. Skipping extended migration.`);
    return;
  }

  const _db = db.withSchema(dbNamespace());

  await _db.schema
    .alterTable("ecr_data")
    .addColumn("latitude", "numeric")
    .addColumn("longitude", "numeric")
    .addColumn("rr_id", "varchar(255)")
    .addColumn("disabilities", "varchar(255)")
    .execute();

  await _db.schema
    .alterTable("patient_address")
    .addColumn("type", "varchar(50)")
    .addColumn("text", "varchar(255)")
    .execute();
}
