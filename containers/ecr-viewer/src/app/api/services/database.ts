// Kysely ORM Connection Client

import { Kysely } from "kysely";

import { pgConstructor } from "./dialects/postgres";
import { sqlServerConstructor } from "./dialects/sqlserver";
import { Core } from "./types/core";
import { Extended } from "./types/extended";

// Dialect to communicate with the database, interface to define its structure.

let db: Kysely<Core> | Kysely<Extended>;

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
export const getDb = () => {
  if (db) {
    return db;
  }

  const db_type = dbDialect();
  const db_schema = dbSchema();

  if (db_schema !== "core" && db_schema !== "extended") {
    throw new Error(`unknown db schema: ${db_schema}`);
  }

  switch (db_type) {
    case "sqlserver":
      db = sqlServerConstructor(db_schema);
      break;
    case "postgres":
      db = pgConstructor(db_schema);
      break;
    default:
      throw new Error(`unknown db type: ${db_type}`);
  }

  // use a different schema in testing so seed data doesn't get wiped out
  db = db.withSchema(dbNamespace());

  return db;
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
    await (getDb() as Kysely<Core>).connection().execute(async (_db) => {});
    return "UP";
  } catch (error: unknown) {
    console.error(error);
    return "DOWN";
  }
};
