import { promises as fs } from "fs";
import path from "path";

import {
  Kysely,
  Migrator,
  FileMigrationProvider,
  PostgresDialect,
  MssqlDialect,
} from "kysely";
import { Pool } from "pg";
import * as tarn from "tarn";
import * as tedious from "tedious";

// Empty interface used only in migrations
interface Database {}

const schema = process.env.SCHEMA;

if (!schema || (schema !== "core" && schema !== "extended")) {
  console.error(
    'Please set SCHEMA environment variable to "core" or "extended"',
  );
  process.exit(1);
}

async function getKyselyInstance(): Promise<Kysely<Database>> {
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

async function migrateDatabase(db: Kysely<Database>, migrationsDir: string) {
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: migrationsDir,
    }),
  });

  const { error, results } = await migrator.migrateToLatest();

  if (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
  console.log("Migrations applied:", results);
}

async function main() {
  const db = await getKyselyInstance();
  const migrationsDir = path.join(__dirname, `db/schemas/${schema}`);
  await migrateDatabase(db, migrationsDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
