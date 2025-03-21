import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

import {
  Kysely,
  Migrator,
  FileMigrationProvider,
  PostgresDialect,
  MssqlDialect,
} from "kysely";
import pkg from "pg";
import * as tarn from "tarn";
import * as tedious from "tedious";

// Empty interface used only in migrations
interface Database {}
const { Pool } = pkg;

async function getKyselyInstance(): Promise<Kysely<Database>> {
  const schema = getSchema();
  if (schema === "core") {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.error(
        "DATABASE_URL environment variable is required for core schema",
      );
      process.exit(1);
    }
    const pgPool = new Pool({ connectionString: databaseUrl });
    return new Kysely({ dialect: new PostgresDialect({ pool: pgPool }) });
  } else {
    const mssqlConfig = {
      server: process.env.SQL_SERVER_HOST || "localhost",
      authentication: {
        type: "default" as const,
        options: {
          userName: process.env.SQL_SERVER_USER,
          password: process.env.SQL_SERVER_PASSWORD,
        },
      },
      options: {
        database: "master", // default database in SQL Server
        encrypt: true,
      },
    };

    const tediousWithFactory = {
      ...tedious,
      connectionFactory: () => new tedious.Connection(mssqlConfig),
      ISOLATION_LEVEL: tedious.ISOLATION_LEVEL,
      Request: tedious.Request,
      TYPES: tedious.TYPES,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any; // Type assertion due to complex external library types

    const tarnConfig = {
      options: {
        min: 0,
        max: 10,
      },
      Pool: tarn.Pool,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any; // Type assertion due to complex external library types

    if (
      !mssqlConfig.server ||
      !mssqlConfig.authentication.options.userName ||
      !mssqlConfig.authentication.options.password ||
      !mssqlConfig.options.database
    ) {
      console.error(
        "SQL_SERVER_HOST, SQL_SERVER_USER, SQL_SERVER_PASSWORD, and DB_CIPHER environment variables are required for extended schema",
      );
      process.exit(1);
    }

    return new Kysely({
      dialect: new MssqlDialect({
        tarn: tarnConfig,
        tedious: tediousWithFactory,
      }),
    });
  }
}

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

function getSchema() {
  if (process.env.METADATA_DATABASE_SCHEMA) {
    return process.env.METADATA_DATABASE_SCHEMA;
  }
  if (
    ["AWS_PG_NON_INTEGRATED", "AZURE_PG_NON_INTEGRATED"].includes(
      process.env.CONFIG_NAME || "",
    )
  ) {
    return "core";
  }
  if (
    ["AWS_SQLSERVER_NON_INTEGRATED", "AZURE_SQLSERVER_NON_INTEGRATED"].includes(
      process.env.CONFIG_NAME || "",
    )
  ) {
    return "extended";
  }
  return undefined;
}

async function main() {
  const schema = getSchema();
  if (!schema || (schema !== "core" && schema !== "extended")) {
    console.warn("No database supported by config. Skipping migration.");
    return;
  }

  const db = await getKyselyInstance();
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
