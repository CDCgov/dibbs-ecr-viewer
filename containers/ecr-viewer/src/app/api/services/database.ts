import { Kysely } from "kysely";

export {
  dbDialect,
  dbNamespace,
  dbSchema,
} from "@/app/data/db/utils/db-config";

import { dbDialect, dbNamespace } from "@/app/data/db/utils/db-config";
import { AnyDb } from "@/app/data/db/utils/types";

import { dialect as postgres } from "./dialects/postgres";
import { dialect as sqlserver } from "./dialects/sqlserver";
import { Common } from "./types/common";

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
  if (!process.env.METADATA_DATABASE_TYPE) {
    return undefined;
  }

  let db: Kysely<Common> | null = null;
  try {
    db = getDb<Common>();
    await db.connection().execute(async () => {});
    return "UP";
  } catch (error) {
    console.error("Database health check failed:", error);
    return "DOWN";
  }
}
