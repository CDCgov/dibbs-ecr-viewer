// Kysely ORM Connection Client

import { Kysely, PostgresDialect, MssqlDialect } from "kysely";
import { Pool } from "pg";
import * as tarn from "tarn";
import * as tedious from "tedious";

import { Extended } from "./extended_types";
import { Core } from "./types";

// Dialect to communicate with the database, interface to define its structure.

let db: Kysely<Core> | Kysely<Extended>;

if (process.env.METADATA_DATABASE_TYPE === "sqlserver") {
  db = new Kysely<Extended>({
    dialect: new MssqlDialect({
      tarn: {
        ...tarn,
        options: {
          min: 0,
          max: 100,
        },
      },
      tedious: {
        ...tedious,
        connectionFactory: () =>
          new tedious.Connection({
            authentication: {
              options: {
                password: process.env.SQL_SERVER_PASSWORD,
                userName: process.env.SQL_SERVER_USER || "sa",
              },
              type: "default",
            },
            options: {
              database: "master",
              port: 1433,
              trustServerCertificate: true,
              connectTimeout: 30000,
            },
            server: process.env.SQL_SERVER_HOST || "localhost",
          }),
      },
    }),
  });
} else {
  db = new Kysely<Core>({
    dialect: new PostgresDialect({
      pool: new Pool({
        database: process.env.POSTGRES_DATABASE || "ecr_viewer_db",
        host: process.env.POSTGRES_HOST,
        user: process.env.POSTGRES_USER,
        port: parseInt(process.env.POSTGRES_PORT || "5432"),
        max: parseInt(process.env.POSTGRES_MAX_THREADPOOL || "10"),
      }),
    }),
  });
}

export { db };
