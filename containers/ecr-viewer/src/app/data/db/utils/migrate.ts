import {
  Kysely,
  Migrator,
  NO_MIGRATIONS,
  MigrationInfo,
  MigrationProvider,
  Migration,
} from "kysely";

import { getUnvalidatedDb } from "@/app/api/services/database";
import commonMigrations from "@/app/data/db/schemas/common";
import coreMigrations from "@/app/data/db/schemas/core";
import extendedMigrations from "@/app/data/db/schemas/extended";

import { dbSchema } from "./db-config";
import { AnyDb } from "./types";

/**
 * Sets up migration environment and executes the provided operation.
 * @param operation Function to execute with database and migration directories.
 * @returns result of `operation`
 */
async function withUnValidatedDb<T>(
  operation: (db: Kysely<AnyDb>) => Promise<T>,
): Promise<T> {
  const db = getUnvalidatedDb<AnyDb>();

  try {
    return await operation(db);
  } finally {
    await db.destroy();
  }
}

const getMigrators = (db: Kysely<AnyDb>) => {
  const commonMigrator = new Migrator({
    db,
    provider: new EcrViewerMigrationProvider({
      schema: "common",
    }),
  });
  const schemaMigrator = new Migrator({
    db,
    provider: new EcrViewerMigrationProvider({
      schema: dbSchema()!,
    }),
  });
  return { commonMigrator, schemaMigrator };
};

/**
 * Executes a migration operation (up or down).
 * @param db Kysely instance.
 * @param command "up" or "down".
 * @param target Optional migration name to migrate to.
 */
async function executeMigration(
  db: Kysely<AnyDb>,
  command: "up" | "down",
  target?: string,
): Promise<void> {
  const { commonMigrator, schemaMigrator } = getMigrators(db);

  if (command === "up") {
    for (const migrator of [commonMigrator, schemaMigrator]) {
      console.log({ migrator });
      const result = await migrator.migrateToLatest();
      if (result.error) {
        throw result.error;
      }

      console.log(
        "Migrations applied:",
        result.results || "No migrations to apply",
      );
    }
  } else if (command === "down") {
    for (const migrator of [schemaMigrator, commonMigrator]) {
      let result;
      if (target) {
        result = await migrator.migrateTo(
          target === "all" ? NO_MIGRATIONS : target,
        );
      } else {
        result = await migrator.migrateDown();
      }

      if (result.error) {
        throw result.error;
      }

      console.log(
        "Migration rolled back:",
        result.results || "No migrations to roll back",
      );
    }
  } else {
    throw new Error(`Unknown migration command: ${command}`);
  }
}

/**
 * Applies all pending migrations.
 */
export async function migrateUp(): Promise<void> {
  await withUnValidatedDb((db) => executeMigration(db, "up"));
}

/**
 * Reverts migrations.
 * @param migrationTarget Optional name of migration to migrate down to (exclusive). If empty, reverts the most recent migration. To migrate all the way down, use argument "all"
 */
export async function migrateDown(migrationTarget?: string): Promise<void> {
  await withUnValidatedDb(async (db) => {
    await executeMigration(db, "down", migrationTarget);
  });
}

/**
 * Get migration info for all migrations
 * @returns list of migrations
 */
export async function getMigrations(): Promise<readonly MigrationInfo[]> {
  return await withUnValidatedDb(
    async (db): Promise<readonly MigrationInfo[]> => {
      const { commonMigrator, schemaMigrator } = getMigrators(db);

      const commonMigrations = await commonMigrator.getMigrations();
      const schemaMigrations = await schemaMigrator.getMigrations();

      return [...commonMigrations, ...schemaMigrations];
    },
  );
}

/**
 * @returns true if there are no pending migrations
 */
export async function dbIsValid(): Promise<boolean> {
  return !(await hasPendingMigrations());
}

/**
 * @returns true if there are pending migrations
 */
export async function hasPendingMigrations(): Promise<boolean> {
  const allMigrations = await getMigrations();
  const executedMigrations = allMigrations
    .filter((m) => m.executedAt)
    .map((m) => m.name);
  return executedMigrations.length < allMigrations.length;
}

class EcrViewerMigrationProvider implements MigrationProvider {
  readonly #props: EcrViewerMigrationProviderProps;

  constructor(props: EcrViewerMigrationProviderProps) {
    this.#props = props;
  }

  async getMigrations(): Promise<Record<string, Migration>> {
    switch (this.#props.schema) {
      case "common": {
        return commonMigrations;
      }
      case "core": {
        return coreMigrations;
      }
      case "extended": {
        return extendedMigrations;
      }
      default: {
        throw new Error(`Unknown migration schema: ${this.#props.schema}`);
      }
    }
  }
}

export interface EcrViewerMigrationProviderProps {
  schema: string;
}
