import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { Kysely, Migrator, TableMetadata, ColumnMetadata } from "kysely";

import { dbSchema } from "@/app/api/services/database";

import * as postgresUtils from "./dialects/postgres/utils";
import * as sqlServerUtils from "./dialects/sqlserver/utils";

type DialectType = "sqlserver" | "postgres";
type SchemaType = "core" | "extended";

export interface DatabaseConfig {
  dialect: DialectType;
  schema: SchemaType;
  namespace: string;
}

export interface DbUtils {
  dbIsValid(db: Kysely<any>): Promise<boolean>;
  resetDbCache(): void;
  metadataDatabaseHealthCheck(): Promise<string | undefined>;
  hasPendingMigrations(db: Kysely<any>): Promise<boolean>;
  getExecutedMigrations(db: Kysely<any>): Promise<string[]>;
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
 * Gets migration directories based on the current schema.
 * @returns Array of migration directories.
 */
function getMigrationDirs(): string[] {
  const schema = dbSchema();
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const commonDir = path.join(__dirname, "./schemas/common");
  const schemaDir = path.join(__dirname, `./schemas/${schema}`);
  return [commonDir, schemaDir];
}

/**
 * Gets the database utility functions for the current dialect.
 * @returns DbUtils instance for the specified dialect.
 * @throws Error if dialect is not supported or not set.
 */
export function getDbUtils(): DbUtils {
  const dialect = process.env.METADATA_DATABASE_TYPE;
  const dialectUtils = dialect === "postgres" ? postgresUtils : sqlServerUtils;

  return {
    async dbIsValid(db: Kysely<any>): Promise<boolean> {
      return !(await this.hasPendingMigrations(db));
    },

    resetDbCache(): void {
      // Placeholder; implement in database.ts if needed
    },

    async metadataDatabaseHealthCheck(): Promise<string | undefined> {
      // Placeholder; implement in database.ts if needed
      return undefined;
    },

    async hasPendingMigrations(db: Kysely<any>): Promise<boolean> {
      const migrator = new Migrator({
        db,
        provider: new MultiDirectoryMigrationProvider(
          getMigrationDirs(),
          fs,
          path,
        ),
      });

      const allMigrations = await migrator.getMigrations();
      const executedMigrations = allMigrations
        .filter((m) => m.executedAt)
        .map((m) => m.name);
      const pendingMigrations = allMigrations.filter(
        (m) => !executedMigrations.includes(m.name),
      );
      return pendingMigrations.length > 0;
    },

    async getExecutedMigrations(db: Kysely<any>): Promise<string[]> {
      const migrator = new Migrator({
        db,
        provider: new MultiDirectoryMigrationProvider(
          getMigrationDirs(),
          fs,
          path,
        ),
      });
      const migrations = await migrator.getMigrations();
      return migrations.filter((m) => m.executedAt).map((m) => m.name);
    },

    getSchemas: dialectUtils.getSchemas,
    getSchema: dialectUtils.getSchema,
    schemaExistsByName: dialectUtils.schemaExistsByName,
    getTables: dialectUtils.getTables,
    getTable: dialectUtils.getTable,
    tableExistsByName: dialectUtils.tableExistsByName,
    getColumns: dialectUtils.getColumns,
    getColumn: dialectUtils.getColumn,
    columnExistsByName: dialectUtils.columnExistsByName,
  };
}
