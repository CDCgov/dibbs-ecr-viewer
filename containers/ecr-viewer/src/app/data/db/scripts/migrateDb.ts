import { migrateUp, migrateDown } from "@/app/data/db/utils/migrate";

async function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);

  try {
    if (command === "up") {
      await migrateUp();
      console.log("All pending migrations have been applied successfully.");
    } else if (command === "down") {
      await migrateDown(args.length > 0 ? args : undefined);
      console.log(
        `Migration(s) rolled back successfully. Reverted: ${
          args.length > 0 ? args.join(", ") : "latest"
        }`,
      );
    } else {
      console.log("Usage: npm run migrate:<command> [-- <arguments>]");
      console.log("Commands:");
      console.log("  up              Apply all pending migrations");
      console.log(
        "  down [names...] Roll back specific migrations or the most recent one if no names provided",
      );
      process.exit(1);
    }
  } catch (error) {
    console.error("Migration failed:", error.message);
    process.exit(1);
  }
}

main();
