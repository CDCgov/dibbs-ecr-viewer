import { randomUUID } from "node:crypto";

import { Kysely } from "kysely";

import { AnyDb } from "@/app/data/metadataDb/database";
import { dbNamespace, dbSchema } from "@/app/data/metadataDb/utils/db-config";

/**
 * Move existing single specimen_type/specimen_collection_date data on ecr_labs
 * into the new one-to-many ecr_lab_specimens table, before those source
 * columns are dropped from ecr_labs.
 */
async function backfillSpecimens(db: Kysely<AnyDb>): Promise<void> {
  const labsWithSpecimens = await db
    .selectFrom("ecr_labs")
    .select(["uuid", "eicr_id", "specimen_type", "specimen_collection_date"])
    .where((eb) =>
      eb.or([
        eb("specimen_type", "is not", null),
        eb("specimen_collection_date", "is not", null),
      ]),
    )
    .execute();

  const specimenRows = labsWithSpecimens.map((lab) => ({
    uuid: randomUUID(),
    eicr_id: lab.eicr_id,
    lab_uuid: lab.uuid,
    specimen_type: lab.specimen_type,
    specimen_collection_date: lab.specimen_collection_date,
  }));

  if (!specimenRows.length) return;

  // SQL Server has a limit of 2100 parameters per query which is the lower number of the two databases we support
  const maxRowsPerBatch = Math.floor(
    2099 / Object.keys(specimenRows[0]).length,
  );
  for (let i = 0; i < specimenRows.length; i += maxRowsPerBatch) {
    await db
      .insertInto("ecr_lab_specimens")
      .values(specimenRows.slice(i, i + maxRowsPerBatch))
      .execute();
  }
}

/**
 * Restore the old single specimen_type/specimen_collection_date columns on
 * ecr_labs from ecr_lab_specimens, for revert purposes. This is inherently
 * lossy for labs with more than one specimen - the old columns only ever
 * supported one, so this arbitrarily keeps a single specimen per lab.
 */
async function restoreLabSpecimenColumns(db: Kysely<AnyDb>): Promise<void> {
  const specimens = await db
    .selectFrom("ecr_lab_specimens")
    .select([
      "lab_uuid",
      "eicr_id",
      "specimen_type",
      "specimen_collection_date",
    ])
    .execute();

  const oneSpecimenPerLab = new Map<string, (typeof specimens)[number]>();
  for (const specimen of specimens) {
    oneSpecimenPerLab.set(`${specimen.lab_uuid}/${specimen.eicr_id}`, specimen);
  }

  for (const specimen of oneSpecimenPerLab.values()) {
    await db
      .updateTable("ecr_labs")
      .set({
        specimen_type: specimen.specimen_type,
        specimen_collection_date: specimen.specimen_collection_date,
      })
      .where("uuid", "=", specimen.lab_uuid)
      .where("eicr_id", "=", specimen.eicr_id)
      .execute();
  }
}

export async function up(db: Kysely<AnyDb>): Promise<void> {
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

  await backfillSpecimens(_db);

  await _db.schema
    .alterTable("ecr_labs")
    .dropColumn("specimen_type")
    .dropColumn("specimen_collection_date")
    .execute();
}

export async function down(db: Kysely<AnyDb>): Promise<void> {
  if (dbSchema() !== "extended") {
    console.log(`${dbSchema()} schema detected. Skipping extended migration.`);
    return;
  }

  const _db = db.withSchema(dbNamespace());

  await _db.schema
    .alterTable("ecr_labs")
    .addColumn("specimen_type", "varchar(255)")
    .addColumn("specimen_collection_date", "date")
    .execute();

  await restoreLabSpecimenColumns(_db);

  await _db.schema.dropTable("ecr_lab_specimens").ifExists().execute();
}
