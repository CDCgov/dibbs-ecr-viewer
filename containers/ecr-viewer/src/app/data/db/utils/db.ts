import { Kysely, TableMetadata, ColumnMetadata } from "kysely";

import * as postgresUtils from "@/app/data/db/dialects/postgres/utils";
import * as sqlServerUtils from "@/app/data/db/dialects/sqlserver/utils";

type DialectType = "sqlserver" | "postgres";
type SchemaType = "core" | "extended";

export interface DatabaseConfig {
  dialect: DialectType;
  schema: SchemaType;
  namespace: string;
}

export interface DbUtils {
  getSchemas(db: Kysely<any>): Promise<string[]>;
  getSchema(db: Kysely<any>, schemaName: string): Promise<TableMetadata[]>;
  schemaExistsByName(db: Kysely<any>, schemaName: string): Promise<boolean>;
  getTables(db: Kysely<any>, schemaName: string): Promise<string[]>;
  getTable(
    db: Kysely<any>,
    schemaName: string,
    tableName: string,
  ): Promise<TableMetadata>;
  tableExistsByName(
    db: Kysely<any>,
    schemaName: string,
    tableName: string,
  ): Promise<boolean>;
  getColumns(
    db: Kysely<any>,
    schemaName: string,
    tableName: string,
  ): Promise<ColumnMetadata[]>;
  getColumn(
    db: Kysely<any>,
    schemaName: string,
    tableName: string,
    columnName: string,
  ): Promise<ColumnMetadata>;
  columnExistsByName(
    db: Kysely<any>,
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
