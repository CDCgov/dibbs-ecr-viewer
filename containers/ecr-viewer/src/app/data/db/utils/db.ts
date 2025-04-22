import { Kysely, TableMetadata, ColumnMetadata } from "kysely";

import * as postgresUtils from "@/app/data/db/dialects/postgres/utils";
import * as sqlServerUtils from "@/app/data/db/dialects/sqlserver/utils";

import { AnyDb } from "./types";

export interface DbUtils {
  schemaExistsByName(db: Kysely<AnyDb>, schemaName: string): Promise<boolean>;
  getTables(db: Kysely<AnyDb>, schemaName: string): Promise<string[]>;
  getTable(
    db: Kysely<AnyDb>,
    schemaName: string,
    tableName: string,
  ): Promise<TableMetadata>;
  tableExistsByName(
    db: Kysely<AnyDb>,
    schemaName: string,
    tableName: string,
  ): Promise<boolean>;
  getColumns(
    db: Kysely<AnyDb>,
    schemaName: string,
    tableName: string,
  ): Promise<ColumnMetadata[]>;
  getColumn(
    db: Kysely<AnyDb>,
    schemaName: string,
    tableName: string,
    columnName: string,
  ): Promise<ColumnMetadata>;
  columnExistsByName(
    db: Kysely<AnyDb>,
    schemaName: string,
    tableName: string,
    columnName: string,
  ): Promise<boolean>;
}

/**
 * get table metadata
 * @param _db a database
 */
export const getTables = (_db: Kysely<AnyDb>) => {};

/**
 * Gets the database utility functions for the current dialect.
 * @returns DbUtils instance for the specified dialect.
 * @throws Error if dialect is not supported or not set.
 */
export function getDbUtils(): DbUtils {
  const dialect = process.env.METADATA_DATABASE_TYPE;
  const dialectUtils = dialect === "postgres" ? postgresUtils : sqlServerUtils;

  return dialectUtils;
}
