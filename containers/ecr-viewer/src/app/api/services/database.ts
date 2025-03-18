// Kysely ORM Connection Client

import { Kysely } from "kysely";

import { pgConstructor } from "./buildPg";
import { sqlConstructor } from "./buildSql";
import { Core } from "./core_types";
import { Extended } from "./extended_types";

// Dialect to communicate with the database, interface to define its structure.

let db: Kysely<Core> | Kysely<Extended>;

const db_type = process.env.METADATA_DATABASE_TYPE;
const db_schema = process.env.METADATA_DATABASE_SCHEMA;

switch (db_type) {
  case "sqlserver":
    if (db_schema === "extended") {
      db = sqlConstructor("extended");
    } else {
      db = sqlConstructor("core");
    }
  case "postgres":
    if (db_schema === "extended") {
      db = pgConstructor("extended");
    } else {
      db = pgConstructor("core");
    }
}

/**
 * Performs a health check on the PostgreSQL database connection.
 * @returns The status of the postgres connection or undefined if missing environment values.
 */
export const metadataDatabaseHealthCheck = async () => {
  if (!process.env.METADATA_DATABASE_TYPE) {
    return undefined;
  }
  try {
    await (db as Kysely<Core>).connection().execute(async (_db) => {});
    return "UP";
  } catch (error: unknown) {
    console.error(error);
    return "DOWN";
  }
};

export { db };
