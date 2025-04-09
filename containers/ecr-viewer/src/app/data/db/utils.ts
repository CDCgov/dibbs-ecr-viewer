import { Kysely } from "kysely";

import * as postgresUtils from "./dialects/postgres/utils";
import * as sqlServerUtils from "./dialects/sqlserver/utils";

import { dbDialect, dbNamespace } from "@/app/api/services/database";
import { dialect as postgres } from "@/app/api/services/dialects/postgres";
import { dialect as sqlserver } from "@/app/api/services/dialects/sqlserver";

// Define a type for the utils object to ensure type safety
export type DbUtils = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getSchemas: (kysely: Kysely<any>) => Promise<any[]>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getSchema: (kysely: Kysely<any>, schemaName: string) => Promise<any>;
  schemaExistsByName: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    kysely: Kysely<any>,
    schemaName: string,
  ) => Promise<boolean>;
  getTables: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    kysely: Kysely<any>,
    schemaName: string,
  ) => Promise<string[]>;
  getTable: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    kysely: Kysely<any>,
    schemaName: string,
    tableName: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) => Promise<any>;
  tableExistsByName: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    kysely: Kysely<any>,
    schemaName: string,
    tableName: string,
  ) => Promise<boolean>;
  getColumns: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    kysely: Kysely<any>,
    schemaName: string,
    tableName: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) => Promise<any[]>;
  getColumn: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    kysely: Kysely<any>,
    schemaName: string,
    tableName: string,
    columnName: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) => Promise<any>;
  columnExistsByName: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    kysely: Kysely<any>,
    schemaName: string,
    tableName: string,
    columnName: string,
  ) => Promise<boolean>;
  getMigrations: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    kysely: Kysely<any>,
  ) => Promise<string[]>;
};

// Select the appropriate utils based on the dialect
/**
 * @returns - The database utility functions for the specified dialect.
 * @throws {Error} - If the dialect is not supported or not set.
 */
export function getDbUtils(): DbUtils {
  const dialect = process.env.METADATA_DATABASE_TYPE;

  if (!dialect) {
    throw new Error("METADATA_DATABASE_TYPE environment variable is not set");
  }

  if (dialect === "postgres") {
    return postgresUtils;
  } else if (dialect === "sqlserver") {
    return sqlServerUtils;
  } else {
    throw new Error(`Unsupported dialect: ${dialect}`);
  }
}

let db: unknown;
/**
 * Get the database global.
 * @returns global db
 */
export const getMigrationDb = <T>() => {
  // if (db) {
  //   return db as Kysely<T>;
  // }

  const db_type = dbDialect();
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

  db = (db as Kysely<T>);

  return db as Kysely<T>;
};