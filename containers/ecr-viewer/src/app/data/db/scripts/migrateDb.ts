import { migrateUp, migrateDown } from "@/app/data/db/utils/migrate";

async function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);

  try {
    if (command === "up") {
      await migrateUp();
      console.log("All pending migrations have been applied successfully.");
    } else if (command === "down") {
      await migrateDown(args.length > 0 ? args[0] : undefined);
      console.log(
        `Migration(s) rolled back successfully. Reverted to: ${
          args.length > 0 ? args[1] : "migration before latest"
        }`,
      );
    } else {
      console.log("Usage: npm run migrate:<command> [-- <arguments>]");
      console.log("Commands:");
      console.log("  up              Apply all pending migrations");
      console.log(
        "  down [target | all] Roll back to a specific migration or all migrations",
      );
      process.exit(1);
    }
  } catch (error) {
    console.error("Migration failed:", (error as Error)?.message);
    process.exit(1);
  }
}

main();
