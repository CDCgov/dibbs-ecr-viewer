import { Kysely } from "kysely";

import { dialect as postgres } from "./dialects/postgres";
import { dialect as sqlserver } from "./dialects/sqlserver";
import { Core } from "./types/core";
import { dbDialect, dbNamespace } from "./utils/db-config";

// When working with migrations, we don't know anything about the
// state of the database, so need to use the any type.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyDb = any;

let cachedDb: unknown;

/**
 * Get the database global without a schema or types attached.
 * @returns global db
 */
export const getDbRaw = (): Kysely<AnyDb> => {
  if (cachedDb) {
    return cachedDb as Kysely<AnyDb>;
  }

  const db_type = dbDialect();
  let db;
  switch (db_type) {
    case "sqlserver":
      db = new Kysely(sqlserver);
      break;
    case "postgres":
      db = new Kysely(postgres);
      break;
    default:
      throw new Error(`unknown db type: ${db_type}`);
  }

  cachedDb = db;
  return db as Kysely<AnyDb>;
};

/**
 * Get the database global.
 * @returns global db
 */
export const getDb = <T>() => {
  return getDbRaw().withSchema(dbNamespace()) as Kysely<T>;
};

/**
 * Performs a health check on the database connection.
 * @param silent Optionally silence the console errors if database not healthy
 * @returns The status of the database connection: "UP" or "DOWN".
 */
export async function metadataDatabaseHealthCheck(
  silent: boolean = false,
): Promise<string | undefined> {
  if (!dbDialect()) {
    return undefined;
  }

  try {
    await getDb<Core>()
      .connection()
      .execute(async () => {});
    return "UP";
  } catch (error: unknown) {
    !silent && console.error("Database health check failed: ", error);
    return "DOWN";
  }
}

/**
 * @returns whether the database is up or undefined if no database
 */
export async function waitForMetadataDatabase(): Promise<boolean | undefined> {
  if (!dbDialect()) {
    return undefined;
  }

  let attempts = 10;

  while (attempts > 0) {
    attempts -= 1;

    const status = await metadataDatabaseHealthCheck(true);
    if (status === "UP") return true;

    // sleep for 2 seconds
    await new Promise((r) => setTimeout(r, 2000));
  }

  return false;
}
