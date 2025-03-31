import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getDb, dbSchema } from "@/app/api/services/database";

import { Kysely, Migrator, FileMigrationProvider } from "kysely";

// Empty interface used only in migrations
interface Database {}

// Run common migrations before schema-specific ones
// Fix import error (https://github.com/kysely-org/kysely/issues/362)? tsc and node and how we import stuff? That's why none of the imports work.

async function runMigration(
  db: Kysely<Database>,
  migrationsDir: string,
  command: string,
  target?: string,
) {
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: migrationsDir,
    }),
  });

  if (command === "up") {
    const { error, results } = await migrator.migrateToLatest();
    if (error) {
      console.error("Migration failed:", error);
      process.exit(1);
    }
    console.log("Migrations applied:", results || "No migrations to apply");
  } else if (command === "down") {
    if (target) {
      const { error, results } = await migrator.migrateTo(target);
      if (error) {
        console.error(`Failed to migrate to ${target}`, error);
        process.exit(1);
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

export async function main() {
  const schema = dbSchema();
  if (!schema || (schema !== "core" && schema !== "extended")) {
    console.warn("No database supported by config. Skipping migration.");
    return;
  }

  const db = getDb() as Kysely<any>;
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const migrationsDir = path.join(__dirname, `../schemas/${schema}`);
  const command = process.argv[2];
  if (!command || (command !== "up" && command !== "down")) {
    console.error('Please provide "up" or "down" as the first argument');
    process.exit(1);
  }

  const target = command === "down" ? process.argv[3] : undefined;
  
  await runMigration(db, migrationsDir, command, target);

  await db.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
