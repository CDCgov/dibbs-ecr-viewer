import { Kysely } from "kysely";

import { dialect as postgres } from "./dialects/postgres";
import { dialect as sqlserver } from "./dialects/sqlserver";
import { Common } from "./types/common";
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
 * @returns The status of the database connection: "UP" or "DOWN".
 */
export async function metadataDatabaseHealthCheck(): Promise<
  string | undefined
> {
  if (!dbDialect()) {
    return undefined;
  }

  try {
    await getDb<Common>()
      .connection()
      .execute(async () => {});
    return "UP";
  } catch (error: unknown) {
    console.error("Database health check failed: ", error);
    return "DOWN";
  }
}
