import { getDb } from "@/app/api/services/database";
import { Common } from "@/app/api/services/types/common";
import { Extended } from "@/app/api/services/types/extended";
import { dbSchema } from "@/app/data/db/utils/db-config";
import { migrateDown, migrateUp } from "@/app/data/db/utils/migrate";

// Use unvalidated database connections for schema operations
const extdb = () => getDb<Extended>();
const commondb = () => getDb<Common>();

/**
 * Drops the common schema tables
 */
export const dropExisting = async () => {
  if (dbSchema()) {
    try {
      migrateDown("all");
    } catch (e: unknown) {}
  }
};

/**
 * Clears the common schema tables
 */
const clearCommon = async () => {
  const db = commondb();
  await db.deleteFrom("ecr_rr_rule_summaries").execute();
  await db.deleteFrom("ecr_rr_conditions").execute();
  await db.deleteFrom("ecr_data").execute();
};

/**
 * Builds the extended schema to a test database
 */
export const buildExtended = async () => {
  await dropExisting();
  process.env.METADATA_DATABASE_SCHEMA = "extended";
  await migrateUp();
};

/**
 * Clears the extended schema tables on a test database
 */
export const clearExtended = async () => {
  await extdb().deleteFrom("patient_address").execute();
  await extdb().deleteFrom("ecr_labs").execute();
  await clearCommon();
};

/**
 * Builds the core schema to a test database
 */
export const buildCore = async () => {
  await dropExisting();
  process.env.METADATA_DATABASE_SCHEMA = "core";
  await migrateUp();
};

/**
 * Clears the core schema tables on a test database
 */
export const clearCore = clearCommon;
