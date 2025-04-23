import { hasPendingMigrations } from "@/app/api/migrate-db/migrate";
import { waitForMetadataDatabase } from "@/app/api/services/database";

// Configuration does not require a database so we don't need to check for pending migrations
if (!!process.env.METADATA_DATABASE_TYPE) {
  waitForMetadataDatabase().then(() => {
    hasPendingMigrations().then((hasPending: boolean) => {
      if (hasPending) {
        console.error(
          "Pending migrations detected. Please submit a POST request to `/ecr-viewer/api/migrate-db?confirm=yes` to migrate the database to the expected state.",
        );
      }
    });
  });
}
