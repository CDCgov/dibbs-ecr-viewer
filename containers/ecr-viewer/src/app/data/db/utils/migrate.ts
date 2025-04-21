import { resolve } from "path";

import {
  Kysely,
  Migrator,
  NO_MIGRATIONS,
  MigrationInfo,
} from "kysely";
import { TSFileMigrationProvider } from 'kysely-ctl'

import { dbSchema, getUnvalidatedDb } from "@/app/api/services/database";

// Empty interface used only in migrations
export interface NoSchema {}

/**
 * Sets up migration environment and executes the provided operation.
 * @param operation Function to execute with database and migration directories.
 * @returns result of `operation`
 */
async function withUnValidatedDb<T>(
  operation: (db: Kysely<NoSchema>) => Promise<T>,
): Promise<T> {
  const db = getUnvalidatedDb<NoSchema>();

  try {
    return await operation(db);
  } catch (error) {
    throw new Error(`Migration operation failed: ${error}`);
  } finally {
    await db.destroy();
  }
}

const getMigrators = (db: Kysely<NoSchema>) => {
  const commonMigrator = new Migrator({
    db,
    provider: new TSFileMigrationProvider({
      migrationFolder: resolve("src/app/data/db/schemas/common"),
    }),
  });
  const schemaMigrator = new Migrator({
    db,
    provider: new TSFileMigrationProvider({
      migrationFolder: resolve(`src/app/data/db/schemas/${dbSchema()}`),
    }),
  });
  return { commonMigrator, schemaMigrator };
};

/**
 * Executes a migration operation (up or down).
 * @param db Kysely instance.
 * @param command "up" or "down".
 * @param target Optional migration name to migrate to.
 */
async function executeMigration(
  db: Kysely<NoSchema>,
  command: "up" | "down",
  target?: string,
): Promise<void> {
  const { commonMigrator, schemaMigrator } = getMigrators(db);

  if (command === "up") {
    for (const migrator of [commonMigrator, schemaMigrator]) {
      const result = await migrator.migrateToLatest();
      console.log(
        "Migrations applied:",
        result.results || "No migrations to apply",
      );

      if (result.error) {
        throw result.error;
      }
    }
  } else if (command === "down") {
    for (const migrator of [schemaMigrator, commonMigrator]) {
      let result;
      if (target) {
        result = await migrator.migrateTo(
          target === "all" ? NO_MIGRATIONS : target,
        );
        console.log(`Migrated to ${target}:`, result.results || "No changes");
      } else {
        result = await migrator.migrateDown();
        console.log(
          "Migration rolled back:",
          result.results || "No migrations to roll back",
        );
      }

      if (result.error) {
        throw result.error;
      }
    }
  } else {
    throw new Error(`Unknown migration command: ${command}`);
  }
}

/**
 * Applies all pending migrations.
 */
export async function migrateUp(): Promise<void> {
  await withUnValidatedDb((db) => executeMigration(db, "up"));
}

/**
 * Reverts migrations.
 * @param migrationTarget Optional name of migration to migrate down to (exclusive). If empty, reverts the most recent migration. To migrate all the way down, use argument "all"
 */
export async function migrateDown(migrationTarget?: string): Promise<void> {
  await withUnValidatedDb(async (db) => {
    await executeMigration(db, "down", migrationTarget);
  });
}

/**
 * Get migration info for all migrations
 * @returns list of migrations
 */
export async function getMigrations(): Promise<readonly MigrationInfo[]> {
  return await withUnValidatedDb(
    async (db): Promise<readonly MigrationInfo[]> => {
      const { commonMigrator, schemaMigrator } = getMigrators(db);

      const commonMigrations = await commonMigrator.getMigrations();
      const schemaMigrations = await schemaMigrator.getMigrations();

      return [...commonMigrations, ...schemaMigrations];
    },
  );
}
