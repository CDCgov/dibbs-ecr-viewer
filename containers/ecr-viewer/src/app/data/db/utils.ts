import { Kysely } from "kysely";

import * as postgresUtils from "./dialects/postgres/utils";
import * as sqlServerUtils from "./dialects/sqlserver/utils";

// Define a type for the utils object to ensure type safety
export type DbUtils = {
  schemaExistsByName: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    kysely: Kysely<any>,
    schemaName: string,
  ) => Promise<boolean>;
  tableExistsByName: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    kysely: Kysely<any>,
    schemaName: string,
    tableName: string,
  ) => Promise<boolean>;
  columnExistsByName: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    kysely: Kysely<any>,
    schemaName: string,
    tableName: string,
    columnName: string,
  ) => Promise<boolean>;
  getColumn: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    kysely: Kysely<any>,
    schemaName: string,
    tableName: string,
    columnName: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) => Promise<any>;
  getTable: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    kysely: Kysely<any>,
    schemaName: string,
    tableName: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) => Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getSchema: (kysely: Kysely<any>, schemaName: string) => Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getSchemas: (kysely: Kysely<any>) => Promise<any[]>;
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
