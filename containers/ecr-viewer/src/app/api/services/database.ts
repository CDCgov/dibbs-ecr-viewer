import { Kysely } from "kysely";

import { getDbUtils, DbUtils } from "@/app/data/db/utils";

import { dialect as postgres } from "./dialects/postgres";
import { dialect as sqlserver } from "./dialects/sqlserver";
import { Common } from "./types/common";

// Cache for the validated database connection
let validatedDb: Kysely<any> | null = null;

// Cache DbUtils to avoid repeated instantiation
let dbUtils: DbUtils | null = null;

/**
 * Gets the cached DbUtils instance.
 * @returns The cached DbUtils instance.
 */
function getCachedDbUtils(): DbUtils {
  if (!dbUtils) {
    dbUtils = getDbUtils();
  }
  return dbUtils;
}

/**
 * Establishes an unvalidated database connection.
 * @returns A new Kysely instance without schema validation.
 * @throws Error if the dialect is unsupported.
 * @template T The type of the database schema.
 */
export function getUnvalidatedDb<T>(): Kysely<T> {
  const { dialect, namespace } = getCachedDbUtils().getDbConfig();

  let db: Kysely<T>;
  switch (dialect) {
    case "sqlserver":
      db = new Kysely<T>(sqlserver);
      break;
    case "postgres":
      db = new Kysely<T>(postgres);
      break;
    default:
      throw new Error(`Unsupported dialect: ${dialect}`);
  }

  return db.withSchema(namespace);
}

/**
 * Gets a validated database connection, throwing if schema is invalid.
 * @returns A validated Kysely instance.
 * @throws Error if the database schema is invalid or if the connection fails.
 * @template T The type of the database schema.
 */
export async function getDb<T>(): Promise<Kysely<T>> {
  if (validatedDb) {
    return validatedDb as Kysely<T>;
  }

  const db = getUnvalidatedDb<T>();
  const isValid = await getCachedDbUtils().dbIsValid(db);
  if (!isValid) {
    await db.destroy();
    throw new Error("Database schema is invalid: pending migrations detected");
  }

  validatedDb = db;
  return db;
}

/**
 * Performs a health check on the database connection.
 */
export async function metadataDatabaseHealthCheck(): Promise<string | undefined> {
  if (!process.env.METADATA_DATABASE_TYPE) {
    return undefined;
  }

  let db: Kysely<Common> | null = null;
  try {
    db = getUnvalidatedDb<Common>();
    await db.connection().execute(async () => {});
    return "UP";
  } catch (error) {
    console.error("Database health check failed:", error);
    return "DOWN";
  } finally {
    if (db) {
      await db.destroy();
    }
  }
}

/**
 * Resets the cached database connection (useful for tests).
 */
export function resetDbCache(): void {
  validatedDb = null;
  dbUtils = null; // Reset cached utils as well
}
