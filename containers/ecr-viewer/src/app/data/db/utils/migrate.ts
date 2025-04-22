import {
  Migrator,
  NO_MIGRATIONS,
  MigrationInfo,
  MigrationProvider,
  Migration,
} from "kysely";

import { getDbRaw } from "@/app/api/services/database";
import commonMigrations from "@/app/data/db/migrations/common";
import coreMigrations from "@/app/data/db/migrations/core";
import extendedMigrations from "@/app/data/db/migrations/extended";

import { dbSchema } from "./db-config";

const getMigrator = () => {
  const db = getDbRaw();
  return new Migrator({
    db,
    provider: new EcrViewerMigrationProvider({
      schema: dbSchema()!,
    }),
  });
};

/**
 * Executes a migration operation (up or down).
 * @param command "up" or "down".
 * @param target Optional migration name to migrate to.
 */
async function executeMigration(
  command: "up" | "down",
  target?: string,
): Promise<void> {
  const migrator = getMigrator();

  let result;
  if (command === "up") {
    result = await migrator.migrateToLatest();
  } else if (command === "down") {
    if (target) {
      result = await migrator.migrateTo(
        target === "all" ? NO_MIGRATIONS : target,
      );
    } else {
      result = await migrator.migrateDown();
    }
  } else {
    throw new Error(`Unknown migration command: ${command}`);
  }

  if (result.error) {
    throw result.error;
  }
}

/**
 * Applies all pending migrations.
 */
export async function migrateUp(): Promise<void> {
  await executeMigration("up");
}

/**
 * Reverts migrations.
 * @param migrationTarget Optional name of migration to migrate down to (exclusive). If empty, reverts the most recent migration. To migrate all the way down, use argument "all"
 */
export async function migrateDown(migrationTarget?: string): Promise<void> {
  await executeMigration("down", migrationTarget);
}

/**
 * Get migration info for all migrations
 * @returns list of migrations
 */
export async function getMigrations(): Promise<readonly MigrationInfo[]> {
  const migrator = getMigrator();
  return await migrator.getMigrations();
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

const addKeyPostfix = <T>(obj: Record<string, T>, postfix: string) => {
  return Object.entries(obj).reduce(
    (acc, [k, v]) => {
      acc[`${k}_${postfix}`] = v as T;
      return acc;
    },
    {} as Record<string, T>,
  );
};

class EcrViewerMigrationProvider implements MigrationProvider {
  readonly #props: EcrViewerMigrationProviderProps;

  constructor(props: EcrViewerMigrationProviderProps) {
    this.#props = props;
  }

  async getMigrations(): Promise<Record<string, Migration>> {
    // must alphabetically be first
    const migrations = addKeyPostfix(commonMigrations, "common") as Record<
      string,
      Migration
    >;

    let schemaMigrations;
    switch (this.#props.schema) {
      case "core": {
        schemaMigrations = coreMigrations as Record<string, Migration>;
        break;
      }
      case "extended": {
        schemaMigrations = extendedMigrations as Record<string, Migration>;
        break;
      }
      default: {
        throw new Error(`Unknown migration schema: ${this.#props.schema}`);
      }
    }

    schemaMigrations = addKeyPostfix(schemaMigrations, this.#props.schema);
    for (const [k, v] of Object.entries(schemaMigrations)) {
      migrations[k] = v as Migration;
    }

    return migrations;
  }
}

export interface EcrViewerMigrationProviderProps {
  schema: string;
}
