import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { Kysely, Migrator } from "kysely";

import { getDb, dbSchema } from "@/app/api/services/database";

import { MultiDirectoryMigrationProvider } from "./multiDirectoryMigrationProvider";

// Empty interface used only in migrations
interface Database {}

// Fix import error (https://github.com/kysely-org/kysely/issues/362)? tsc and node and how we import stuff? That's why none of the imports work.

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
 *
 * @param command "up" or "down"; specifies the direction of the migration to run
 */
export async function migrate(command: string) {
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
    if (!command || (command !== "up" && command !== "down")) {
      console.error('Please provide "up" or "down" as the first argument');
    }

    const target = command === "down" ? process.argv[3] : undefined;

    await runMigration(db, [commonDir, migrationsDir], command, target);

    await db.destroy();
  } catch (error) {
    throw new Error("Migration failed: " + error);
  }
}
