import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { Kysely, Migrator } from "kysely";

import { getDb, dbSchema } from "@/app/api/services/database";

import { MultiDirectoryMigrationProvider } from "./multiDirectoryMigrationProvider";

// Empty interface used only in migrations
interface Database {}

async function runMigration(
  db: Kysely<Database>,
  migrationsDir: string[],
  command: string,
  target?: string,
) {
  const migrator = new Migrator({
    db,
    provider: new MultiDirectoryMigrationProvider(migrationsDir, fs, path),
  });
  if (command === "up") {
    const { error, results } = await migrator.migrateToLatest();
    console.log("Migration results: ", results); //
    if (error) {
      throw new Error("Migration failed: " + error);
    }
    console.log("Migrations applied:", results || "No migrations to apply");
  } else if (command === "down") {
    if (target) {
      const { error, results } = await migrator.migrateTo(target);
      if (error) {
        console.error(`Failed to migrate to ${target}`, error);
      }
      console.log(`Migrated to ${target}`, results || "No changes");
    } else {
      const { error, results } = await migrator.migrateDown();
      if (error) {
        console.error("Rollback failed:", error);
        process.exit(1);
      }
      console.log(
        "Migration rolled back:",
        results || "No migrations to roll back",
      );
    }
  }
}

/**
 * Applies all pending migrations
 */
export async function migrateUp() {
  try {
    const schema = dbSchema();
    if (!schema || (schema !== "core" && schema !== "extended")) {
      console.warn("No database supported by config. Skipping migration.");
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getDb() as Kysely<any>;
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const commonDir = path.join(__dirname, `../schemas/common`);
    const migrationsDir = path.join(__dirname, `../schemas/${schema}`);

    await runMigration(db, [commonDir, migrationsDir], "up");

    await db.destroy();
  } catch (error) {
    throw new Error("Migration failed: " + error);
  }
}

/**
 * Reverts migrations
 * @param migrationNames Optional array of migration names to revert. If empty, reverts the most recent migration.
 */
export async function migrateDown(migrationNames: string[] = []) {
  try {
    const schema = dbSchema();
    if (!schema || (schema !== "core" && schema !== "extended")) {
      console.warn("No database supported by config. Skipping migration.");
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getDb() as Kysely<any>;
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const commonDir = path.join(__dirname, `../schemas/common`);
    const migrationsDir = path.join(__dirname, `../schemas/${schema}`);

    if (migrationNames.length === 0) {
      // Revert the most recent migration
      await runMigration(db, [commonDir, migrationsDir], "down");
    } else {
      // Revert each specified migration one by one
      for (const migrationName of migrationNames) {
        await runMigration(
          db,
          [commonDir, migrationsDir],
          "down",
          migrationName,
        );
      }
    }

    await db.destroy();
  } catch (error) {
    throw new Error("Migration failed: " + error);
  }
}
