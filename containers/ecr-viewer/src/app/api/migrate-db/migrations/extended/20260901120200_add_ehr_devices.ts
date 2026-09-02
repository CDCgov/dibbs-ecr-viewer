import { randomUUID } from "node:crypto";

import { Kysely } from "kysely";

import { AnyDb } from "@/app/data/metadataDb/database";
import { dbNamespace, dbSchema } from "@/app/data/metadataDb/utils/db-config";

/**
 * Move existing single ehr_software/ehr_manufacturer_model data on ecr_data
 * into the new one-to-many ecr_ehr_devices table, before those source
 * columns are dropped from ecr_data.
 */
async function backfillEhrDevices(db: Kysely<AnyDb>): Promise<void> {
  const ecrDataWithEhrDevices = await db
    .selectFrom("ecr_data")
    .select(["eicr_id", "ehr_software", "ehr_manufacturer_model"])
    .where((eb) =>
      eb.or([
        eb("ehr_software", "is not", null),
        eb("ehr_manufacturer_model", "is not", null),
      ]),
    )
    .execute();

  const ehrDeviceRows = ecrDataWithEhrDevices.map((row) => ({
    uuid: randomUUID(),
    eicr_id: row.eicr_id,
    ehr_software: row.ehr_software,
    ehr_manufacturer_model: row.ehr_manufacturer_model,
  }));

  if (!ehrDeviceRows.length) return;

  // SQL Server has a limit of 2100 parameters per query which is the lower number of the two databases we support
  const maxRowsPerBatch = Math.floor(
    2099 / Object.keys(ehrDeviceRows[0]).length,
  );
  for (let i = 0; i < ehrDeviceRows.length; i += maxRowsPerBatch) {
    await db
      .insertInto("ecr_ehr_devices")
      .values(ehrDeviceRows.slice(i, i + maxRowsPerBatch))
      .execute();
  }
}

/**
 * Restore the old single ehr_software/ehr_manufacturer_model columns on
 * ecr_data from ecr_ehr_devices, for revert purposes. This is inherently
 * lossy for eCRs with more than one EHR software or manufacturer model - the old columns only ever
 * supported one, so this arbitrarily keeps a single EHR device per eCR.
 */
async function restoreEhrDeviceColumns(db: Kysely<AnyDb>): Promise<void> {
  const ehrDevices = await db
    .selectFrom("ecr_ehr_devices")
    .select([
      "uuid",
      "eicr_id",
      "ehr_software",
      "ehr_manufacturer_model",
    ])
    .execute();

  const oneDevicePerEcr = new Map<string, (typeof ehrDevices)[number]>();
  for (const device of ehrDevices) {
    oneDevicePerEcr.set(device.eicr_id, device);
  }

  for (const device of oneDevicePerEcr.values()) {
    await db
      .updateTable("ecr_data")
      .set({
        ehr_software: device.ehr_software,
        ehr_manufacturer_model: device.ehr_manufacturer_model,
      })
      .where("eicr_id", "=", device.eicr_id)
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
    .createTable("ecr_ehr_devices")
    .addColumn("uuid", "varchar(200)")
    .addColumn("eicr_id", "varchar(200)")
    .addColumn("ehr_software", "varchar(255)")
    .addColumn("ehr_manufacturer_model", "varchar(255)")
    .addPrimaryKeyConstraint("ecr_ehr_devices_pk_uuid_eicr_id", [
      "uuid",
      "eicr_id",
    ])
    .addForeignKeyConstraint(
      "ecr_ehr_devices_fk_eicr_id",
      ["eicr_id"],
      "ecr_data",
      ["eicr_id"],
    )
    .execute();

  await backfillEhrDevices(_db);

  await _db.schema
    .alterTable("ecr_data")
    .dropColumn("ehr_software")
    .dropColumn("ehr_manufacturer_model")
    .execute();
}

export async function down(db: Kysely<AnyDb>): Promise<void> {
  if (dbSchema() !== "extended") {
    console.log(`${dbSchema()} schema detected. Skipping extended migration.`);
    return;
  }

  const _db = db.withSchema(dbNamespace());

  await _db.schema
    .alterTable("ecr_data")
    .addColumn("ehr_software", "varchar(255)")
    .addColumn("ehr_manufacturer_model", "varchar(255)")
    .execute();

  await restoreEhrDeviceColumns(_db);

  await _db.schema.dropTable("ecr_ehr_devices").ifExists().execute();
}
