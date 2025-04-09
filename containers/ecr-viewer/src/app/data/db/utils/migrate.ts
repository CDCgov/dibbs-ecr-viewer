import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { Kysely, Migrator } from "kysely";

import { getDb, dbSchema, dbNamespace } from "@/app/api/services/database";
import { getMigrations } from "@/app/data/db/dialects/postgres/utils";

import { MultiDirectoryMigrationProvider } from "./multiDirectoryMigrationProvider";
import { getDbUtils, getMigrationDb } from "@/app/data/db/utils";

import { up as common } from "../schemas/common/19700101000000_initial";
import { up as core} from "../schemas/core/19700101000001_initial";
import { up as extended } from "../schemas/extended/19700101000001_initial";

// Empty interface used only in migrations
interface Database {}

const utils = getDbUtils();

/**
 * Sets up migration environment and handles database operations
 * @param operation
 */
async function withMigrationEnv(
  operation: (params: {
    db: Kysely<Database>;
    migrationDirs: string[];
  }) => Promise<void>,
): Promise<void> {
  const schema = dbSchema();
  console.log("2")
  if (!schema || (schema !== "core" && schema !== "extended")) {
    console.warn("No database supported by config. Skipping migration.");
    return;
  }
  const db = getMigrationDb() as Kysely<any>;

  console.log("3")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any

  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const commonDir = path.join(__dirname, `../schemas/common`);
    const schemaDir = path.join(__dirname, `../schemas/${schema}`);

    await operation({ db, migrationDirs: [commonDir, schemaDir] });
    console.log('7')
  } catch (error) {
    throw new Error("Migration failed: " + error);
  } finally {
    // await db.destroy();
  }
}

/**
 * Executes a specific migration operation
 * @param db
 * @param migrationDirs
 * @param command
 * @param target
 */
async function executeMigration(
  db: Kysely<Database>,
  migrationDirs: string[],
  command: "up" | "down",
  target?: string,
): Promise<void> {
  console.log("4")
  const migrator = new Migrator({
    db,
    provider: new MultiDirectoryMigrationProvider(migrationDirs, fs, path),
  });

  let result;
  if (command === "up") {
    console.log("5")
    result = await migrator.migrateToLatest(); //
    console.log("yups")
    console.log(
      "Migrations applied:",
      result.results || "No migrations to apply",
    );
  } else {
    console.log("6")
    if (target) {
      result = await migrator.migrateTo(target);
      console.log(`Migrated to ${target}`, result.results || "No changes");
    } else {
      result = await migrator.migrateDown();
      console.log(
        "Migration rolled back:",
        result.results || "No migrations to roll back",
      );
    }
  }

  if (result.error) {
    console.log('errorerror')
    throw result.error;
  }
}

/**
 * Applies all pending migrations
 */
export async function migrateUp(): Promise<void> {
  await withMigrationEnv(({ db, migrationDirs }) =>
    executeMigration(db, migrationDirs, "up"),
  );
}

/**
 * Reverts migrations
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
/**
 * Checks if there are any pending migrations
 * @returns True if there are pending migrations, false otherwise
 */
export async function hasPendingMigrations(): Promise<boolean> {
  let hasPending = true;

  await withMigrationEnv(async ({ db, migrationDirs }) => {
    const migrator = new Migrator({
      db,
      provider: new MultiDirectoryMigrationProvider(migrationDirs, fs, path),
    });

    const executedMigrations = await getMigrations(db);
    const allMigrations = await migrator.getMigrations();
    const pendingMigrations = allMigrations.filter(
      (migration) => !executedMigrations.includes(migration.name),
    );
    hasPending = pendingMigrations.length > 0;
  });

  return hasPending;
}
