import {
  Migrator,
  NO_MIGRATIONS,
  MigrationInfo,
  MigrationProvider,
  Migration,
} from "kysely";

import { getDbRaw } from "@/app/data/metadataDb/database";
import {
  dbDialect,
  dbNamespace,
  dbSchema,
} from "@/app/data/metadataDb/utils/db-config";

import coreMigrations from "./migrations/core";
import extendedMigrations from "./migrations/extended";

const getMigrator = () => {
  const db = getDbRaw();
  return new Migrator({
    db,
    migrationTableName: dbDialect() === "postgres" ? `schema_migration` : `${dbNamespace()}_schema_migration`,
    migrationLockTableName: dbDialect() === "postgres" ? `schema_migration_lock` : `${dbNamespace()}_schema_migration_lock`,
    migrationTableSchema: dbDialect() === "postgres" ? dbNamespace() : undefined,
    provider: new EcrViewerMigrationProvider({
      schema: dbSchema()!,
    }),
  });
};

/**
 * Applies all pending migrations.
 */
export async function migrateUp(): Promise<void> {
  const migrator = getMigrator();
  const result = await migrator.migrateToLatest();

  if (result.error) {
    throw result.error;
  }
}

/**
 * Reverts migrations.
 * @param migrationTarget Optional name of migration to migrate down to (exclusive). If empty, reverts the most recent migration. To migrate all the way down, use argument "all"
 */
export async function migrateDown(migrationTarget?: string): Promise<void> {
  const migrator = getMigrator();

  let result;
  if (migrationTarget) {
    result = await migrator.migrateTo(
      migrationTarget === "all" ? NO_MIGRATIONS : migrationTarget,
    );
  } else {
    result = await migrator.migrateDown();
  }

  if (result.error) {
    throw result.error;
  }
}

/**
 * Get migration info for all migrations
 * @returns list of migrations
 */
export async function getMigrations(): Promise<readonly MigrationInfo[]> {
  const migrator = getMigrator();
  return await migrator.getMigrations();
}

/**
 * @returns true if there are no pending migrations
 */
export async function dbIsValid(): Promise<boolean> {
  return !!dbDialect() && !(await hasPendingMigrations());
}

/**
 * @returns true if there are pending migrations
 */
export async function hasPendingMigrations(): Promise<boolean> {
  const allMigrations = await getMigrations();
  const executedMigrations = allMigrations
    .filter((m) => m.executedAt)
    .map((m) => m.name);
  return executedMigrations.length !== allMigrations.length;
}

// helper to add a postfix to each key in the record
const addKeyPostfix = <T>(obj: Record<string, T>, postfix: string) => {
  return Object.entries(obj).reduce(
    (acc, [k, v]) => {
      acc[`${k}_${postfix}`] = v as T;
      return acc;
    },
    {} as Record<string, T>,
  );
};

// Custom migration provider that selects the correct imported migrations
// based on the schema and makes sure the migrations are named appropriately.
// NOTE: migrations are run in alphanumeric sort order, so make sure that
// migrations to common are run before schema migrations of the same file name
class EcrViewerMigrationProvider implements MigrationProvider {
  readonly #props: EcrViewerMigrationProviderProps;

  constructor(props: EcrViewerMigrationProviderProps) {
    this.#props = props;
  }

  async getMigrations(): Promise<Record<string, Migration>> {
    // must alphabetically be first
    const migrations = addKeyPostfix(coreMigrations, "core") as Record<
      string,
      Migration
    >;

    if (this.#props.schema === "extended") {
      let schemaMigrations = extendedMigrations as Record<string, Migration>;

      schemaMigrations = addKeyPostfix(schemaMigrations, this.#props.schema);
      for (const [k, v] of Object.entries(schemaMigrations)) {
        migrations[k] = v as Migration;
      }
    }

    return migrations;
  }
}

export interface EcrViewerMigrationProviderProps {
  schema: string;
}
