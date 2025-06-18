import { migrateDown, migrateUp } from "@/app/api/migrate-db/migrate";
import { getDb } from "@/app/data/metadataDb/database";
import { Core } from "@/app/data/metadataDb/types/core";
import { Extended } from "@/app/data/metadataDb/types/extended";
import { dbSchema } from "@/app/data/metadataDb/utils/db-config";

/**
 * Drops the common schema tables
 */
export const dropExisting = async () => {
  if (dbSchema()) {
    migrateDown("all");
  }
};

/**
 * Builds the core schema to a test database
 */
export const buildCore = async () => {
  process.env.METADATA_DATABASE_SCHEMA = "core";
  await migrateUp();
};

/**
 * Clears the core schema tables
 */
export const clearCore = async () => {
  const db = getDb<Core>();
  await clearEcrCore();
  await db.deleteFrom("condition_reference").execute();
  await db.deleteFrom("user_program_area").execute();
  await db.deleteFrom("program_area").execute();
  await db.deleteFrom("user").execute();
};

/**
 * Clears the ecr tables form the core schema tables
 */
export const clearEcrCore = async () => {
  const db = getDb<Core>();
  await db.deleteFrom("ecr_rr_rule_summaries").execute();
  await db.deleteFrom("ecr_rr_conditions").execute();
  await db.deleteFrom("ecr_data").execute();
};

/**
 * Builds the extended schema to a test database
 */
export const buildExtended = async () => {
  process.env.METADATA_DATABASE_SCHEMA = "extended";
  await migrateUp();
};

/**
 * Clears the extended schema tables on a test database
 */
export const clearExtended = async () => {
  const db = getDb<Extended>();
  await db.deleteFrom("patient_address").execute();
  await db.deleteFrom("ecr_labs").execute();
  await clearCore();
};

/**
 * Clears the extended schema tables on a test database
 */
export const clearEcrExtended = async () => {
  const db = getDb<Extended>();
  await db.deleteFrom("patient_address").execute();
  await db.deleteFrom("ecr_labs").execute();
  await clearEcrCore();
};
