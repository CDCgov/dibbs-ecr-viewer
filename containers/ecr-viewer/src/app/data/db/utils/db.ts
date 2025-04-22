import { Kysely, TableMetadata, ColumnMetadata } from "kysely";

import * as postgresUtils from "@/app/data/db/dialects/postgres/utils";
import * as sqlServerUtils from "@/app/data/db/dialects/sqlserver/utils";

import { NoSchema } from "./migrate";

type DialectType = "sqlserver" | "postgres";
type SchemaType = "core" | "extended";

export interface DatabaseConfig {
  dialect: DialectType;
  schema: SchemaType;
  namespace: string;
}

export interface DbUtils {
  schemaExistsByName(
    db: Kysely<NoSchema>,
    schemaName: string,
  ): Promise<boolean>;
  getTables(db: Kysely<NoSchema>, schemaName: string): Promise<string[]>;
  getTable(
    db: Kysely<NoSchema>,
    schemaName: string,
    tableName: string,
  ): Promise<TableMetadata>;
  tableExistsByName(
    db: Kysely<NoSchema>,
    schemaName: string,
    tableName: string,
  ): Promise<boolean>;
  getColumns(
    db: Kysely<NoSchema>,
    schemaName: string,
    tableName: string,
  ): Promise<ColumnMetadata[]>;
  getColumn(
    db: Kysely<NoSchema>,
    schemaName: string,
    tableName: string,
    columnName: string,
  ): Promise<ColumnMetadata>;
  columnExistsByName(
    db: Kysely<NoSchema>,
    schemaName: string,
    tableName: string,
    columnName: string,
  ): Promise<boolean>;
}

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
