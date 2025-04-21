import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { Kysely, Migrator } from "kysely";

import { dbSchema, getUnvalidatedDb } from "@/app/api/services/database";

import { MultiDirectoryMigrationProvider } from "./multiDirectoryMigrationProvider";

import { getDbUtils } from "./";


// Empty interface used only in migrations
interface Database {}

/**
 * Sets up migration environment and executes the provided operation.
 * @param operation Function to execute with database and migration directories.
 */
async function withMigrationEnv(
  operation: (params: {
    db: Kysely<Database>;
    migrationDirs: string[];
  }) => Promise<void>,
): Promise<void> {
  const schema = dbSchema();
  const db = getUnvalidatedDb<Database>();

  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const commonDir = path.join(__dirname, "../schemas/common");
    const schemaDir = path.join(__dirname, `../schemas/${schema}`);

    await operation({ db, migrationDirs: [commonDir, schemaDir] });
  } catch (error) {
    throw new Error(`Migration operation failed: ${error}`);
  } finally {
    await db.destroy();
  }
}

/**
 * Executes a migration operation (up or down).
 * @param db Kysely instance.
 * @param migrationDirs Directories containing migration files.
 * @param command "up" or "down".
 * @param target Optional migration name to migrate to.
 */
async function executeMigration(
  db: Kysely<Database>,
  migrationDirs: string[],
  command: "up" | "down",
  target?: string,
): Promise<void> {
  const migrator = new Migrator({
    db,
    provider: new MultiDirectoryMigrationProvider(migrationDirs, fs, path),
  });

  let result;
  if (command === "up") {
    result = await migrator.migrateToLatest();
    console.log(
      "Migrations applied:",
      result.results || "No migrations to apply",
    );
  } else {
    if (target) {
      result = await migrator.migrateTo(target);
      console.log(`Migrated to ${target}:`, result.results || "No changes");
    } else {
      result = await migrator.migrateDown();
      console.log(
        "Migration rolled back:",
        result.results || "No migrations to roll back",
      );
    }
  }

  if (result.error) {
    throw result.error;
  }
}

/**
 * Applies all pending migrations.
 */
export async function migrateUp(): Promise<void> {
  await withMigrationEnv(({ db, migrationDirs }) =>
    executeMigration(db, migrationDirs, "up"),
  );
}

/**
 * Reverts migrations.
 * @param migrationNames Optional array of migration names to revert. If empty, reverts the most recent migration.
 */
export async function migrateDown(
  migrationNames: string[] = [],
): Promise<void> {
  await withMigrationEnv(async ({ db, migrationDirs }) => {
    if (migrationNames.length === 0) {
      await executeMigration(db, migrationDirs, "down");
    } else {
      for (const migrationName of migrationNames) {
        await executeMigration(db, migrationDirs, "down", migrationName);
      }
    }
  });
}
