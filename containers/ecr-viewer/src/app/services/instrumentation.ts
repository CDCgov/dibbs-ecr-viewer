import { randomUUID } from "node:crypto";

import { hasPendingMigrations } from "@/app/api/migrate-db/migrate";
import { waitForMetadataDatabase } from "@/app/api/services/database";

// Configuration does not require a database so we don't need to check for pending migrations
if (!!process.env.METADATA_DATABASE_TYPE) {
  // Generate a secret for this ecr viewer server with a UUID required to use the
  // `/ecr-viewer/api/migrate-db` endpoint (if not provided via env already)
  process.env.METADATA_DATABASE_MIGRATION_SECRET ||= randomUUID();

  waitForMetadataDatabase().then(() => {
    hasPendingMigrations().then((hasPending: boolean) => {
      if (hasPending) {
        console.error(
          `Pending migrations detected. Please submit a POST request to \`/ecr-viewer/api/migrate-db\` to migrate the database to the expected state. The body must contain a form with the field \`migration_secret=${process.env.METADATA_DATABASE_MIGRATION_SECRET}\``,
        );
      }
    });
  });
}
