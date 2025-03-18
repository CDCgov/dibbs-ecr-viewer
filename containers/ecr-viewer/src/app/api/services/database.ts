// Kysely ORM Connection Client

import { Kysely } from "kysely";

import { pgConstructor } from "./buildPg";
import { sqlConstructor } from "./buildSql";
import { Core } from "./core_types";
import { Extended } from "./extended_types";

// Dialect to communicate with the database, interface to define its structure.

let db: Kysely<Core> | Kysely<Extended>;

/**
 * Get the database global.
 * @returns global db
 */
export const getDb = () => {
  if (db) {
    return db;
  }

  const db_type = process.env.METADATA_DATABASE_TYPE;
  const db_schema = process.env.METADATA_DATABASE_SCHEMA;

  if (db_schema !== "core" && db_schema !== "extended") {
    throw new Error(`unknown db schema: ${db_schema}`);
  }

  switch (db_type) {
    case "sqlserver":
      db = sqlConstructor(db_schema);
      break;
    case "postgres":
      db = pgConstructor(db_schema);
      break;
    default:
      throw new Error(`unknown db type: ${db_type}`);
  }

  return db;
};
/**
 * Performs a health check on the PostgreSQL database connection.
 * @returns The status of the postgres connection or undefined if missing environment values.
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

export { db };
