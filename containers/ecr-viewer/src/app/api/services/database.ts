// Kysely ORM Connection Client

import { Core } from "./types"
import { Extended } from "./extended_types"
import { Pool } from "pg"
import { Kysely, PostgresDialect, MssqlDialect } from "kysely"
import * as tedious from "tedious"
import * as tarn from "tarn"

const pg_dialect = new PostgresDialect({
  pool: new Pool({
    database: "ecr_viewer_db",
    host: "localhost",
    user: "postgres",
    port: 5432,
    max: 10,
  }),
});

const ms_dialect = new MssqlDialect({
    tarn: {
      ...tarn,
      options: {
        min: 0,
        max: 100,
      },
    },
    tedious: {
      ...tedious,
      connectionFactory: () => new tedious.Connection({
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
      }
    )},
})

// Dialect to communicate with the database, interface to define its structure.

let db: Kysely<Core> | Kysely<Extended>;

if (process.env.METADATA_DATABASE_TYPE === 'sqlserver') {
  db = new Kysely<Extended>({
    dialect: ms_dialect,
  })
} else if (process.env.METADATA_DATABASE_TYPE === 'postgres') {
  db = new Kysely<Core>({
    dialect: pg_dialect,
  })
} else {
  db = new Kysely<Core>({
    dialect: pg_dialect,
  })
}

// export const db = new Kysely<Core>({
//   dialect: pg_dialect,
// })

export { db };
