// Kysely ORM Connection Client

import { Kysely } from "kysely";

import { dialect as postgres } from "./dialects/postgres";
import { dialect as sqlserver } from "./dialects/sqlserver";
import { Common } from "./types/common";

// Dialect to communicate with the database, interface to define its structure.

let db: unknown;

/**
 * Get the current database dialect
 * @returns string describing dialect
 */
export const dbDialect = () => {
  return process.env.METADATA_DATABASE_TYPE;
};

/**
 * Get the current database schema
 * @returns string describing schema
 */
export const dbSchema = () => {
  return process.env.METADATA_DATABASE_SCHEMA;
};

/**
 * Get the current database namespace (schema)
 * @returns string describing namespace
 */
export const dbNamespace = () => {
  return process.env.TEST_TYPE === "integration"
    ? "test_ev_schema"
    : "ecr_viewer";
};

/**
 * Get the database global.
 * @returns global db
 */
export const getDb = <T>() => {
  if (db) {
    return db as Kysely<T>;
  }

  const db_type = dbDialect();
  const db_schema = dbSchema();

  if (db_schema !== "core" && db_schema !== "extended") {
    throw new Error(`unknown db schema: ${db_schema}`);
  }

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

  // use a different schema in testing so seed data doesn't get wiped out
  db = (db as Kysely<T>).withSchema(dbNamespace());

  return db as Kysely<T>;
};

/**
 * Performs a health check on the metadata database connection.
 * @returns The status of the metadata db connection or undefined if missing environment values.
 */
export const metadataDatabaseHealthCheck = async () => {
  if (!process.env.METADATA_DATABASE_TYPE) {
    return undefined;
  }
  try {
    await getDb<Common>()
      .connection()
      .execute(async (_db) => {});
    return "UP";
  } catch (error: unknown) {
    console.error(error);
    return "DOWN";
  }
};
