import { Kysely, TableMetadata, ColumnMetadata } from "kysely";

import * as postgresUtils from "./dialects/postgres/utils";
import * as sqlServerUtils from "./dialects/sqlserver/utils";
import { getMigrations } from "./utils/migrate";

type DialectType = "sqlserver" | "postgres";
type SchemaType = "core" | "extended";

export interface DatabaseConfig {
  dialect: DialectType;
  schema: SchemaType;
  namespace: string;
}

export interface DbUtils {
  dbIsValid(): Promise<boolean>;
  hasPendingMigrations(): Promise<boolean>;
  getExecutedMigrations(): Promise<string[]>;
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
 * Get the current database dialect
 * @returns string describing dialect
 */
export const dbDialect = () => {
  return process.env.METADATA_DATABASE_TYPE;
};

/**
 * Get the current database namespace (schema)
 * @returns string describing namespace
 */
export const dbNamespace = () => {
  // use a different schema in testing so seed data doesn't get wiped out
  return process.env.TEST_TYPE === "integration"
    ? "test_ev_schema"
    : "ecr_viewer";
};

/**
 * Get the current database schema
 * @returns string describing schema
 */
export const dbSchema = () => {
  return process.env.METADATA_DATABASE_SCHEMA;
};

/**
 * Gets the database utility functions for the current dialect.
 * @returns DbUtils instance for the specified dialect.
 * @throws Error if dialect is not supported or not set.
 */
export function getDbUtils(): DbUtils {
  const dialect = process.env.METADATA_DATABASE_TYPE;
  const dialectUtils = dialect === "postgres" ? postgresUtils : sqlServerUtils;

  return {
    async dbIsValid(): Promise<boolean> {
      return !(await this.hasPendingMigrations());
    },

    async hasPendingMigrations(): Promise<boolean> {
      const allMigrations = await getMigrations();
      const executedMigrations = allMigrations
        .filter((m) => m.executedAt)
        .map((m) => m.name);
      return executedMigrations.length < allMigrations.length;
    },

    async getExecutedMigrations(): Promise<string[]> {
      const migrations = await getMigrations();
      return migrations.filter((m) => m.executedAt).map((m) => m.name);
    },

    ...dialectUtils,
  };
}
