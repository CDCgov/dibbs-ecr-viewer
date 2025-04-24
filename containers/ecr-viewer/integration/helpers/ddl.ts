import { migrateDown, migrateUp } from "@/app/api/migrate-db/migrate";
import { getDb } from "@/app/api/services/database";
import { Extended } from "@/app/api/services/types/extended";
import { dbSchema } from "@/app/api/services/utils/db-config";

/**
 * Drops the common schema tables
 */
export const dropExisting = async () => {
  if (dbSchema()) {
    migrateDown("all");
  }
};

/**
 * Clears the common schema tables
 */
const clearCommon = async () => {
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
  await clearCommon();
};

/**
 * Builds the core schema to a test database
 */
export const buildCore = async () => {
  process.env.METADATA_DATABASE_SCHEMA = "core";
  await migrateUp();
};

/**
 * Clears the core schema tables on a test database
 */
export const clearCore = clearCommon;
