import { hasPendingMigrations } from "@/app/data/db/utils/migrate";

// Configuration does not require a database so we don't need to check for pending migrations
if (!!process.env.METADATA_DATABASE_TYPE) {
  hasPendingMigrations().then((hasPending: boolean) => {
    if (hasPending) {
      console.error(
        // TODO add the route instructions ehre
        "Pending migrations detected. Please run the migration command.",
      );
    }
  });
}
