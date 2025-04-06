import { Kysely } from "kysely";

import * as postgresUtils from "./dialects/postgres/utils";
import * as sqlServerUtils from "./dialects/sqlserver/utils";

// Define a type for the utils object to ensure type safety
export type DbUtils = {
  schemaExistsByName: (
    kysely: Kysely<any>,
    schemaName: string,
  ) => Promise<boolean>;
  tableExistsByName: (
    kysely: Kysely<any>,
    schemaName: string,
    tableName: string,
  ) => Promise<boolean>;
  columnExistsByName: (
    kysely: Kysely<any>,
    schemaName: string,
    tableName: string,
    columnName: string,
  ) => Promise<boolean>;
  getColumn: (
    kysely: Kysely<any>,
    schemaName: string,
    tableName: string,
    columnName: string,
  ) => Promise<any>;
  getTable: (
    kysely: Kysely<any>,
    schemaName: string,
    tableName: string,
  ) => Promise<any>;
  getSchema: (kysely: Kysely<any>, schemaName: string) => Promise<any>;
  getSchemas: (kysely: Kysely<any>) => Promise<any[]>;
};

// Select the appropriate utils based on the dialect
/**
 * @returns - The database utility functions for the specified dialect.
 * @throws {Error} - If the dialect is not supported or not set.
 */
export function getDbUtils(): DbUtils {
  const dialect = process.env.DB_DIALECT;

  if (!dialect) {
    throw new Error("DB_DIALECT environment variable is not set");
  }

  if (dialect === "postgres") {
    return postgresUtils;
  } else if (dialect === "sqlserver") {
    return sqlServerUtils;
  } else {
    throw new Error(`Unsupported dialect: ${dialect.constructor.name}`);
  }
}
