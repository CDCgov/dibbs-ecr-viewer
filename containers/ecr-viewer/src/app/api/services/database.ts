// Kysely ORM connection client

// look at ENV variable to determine which type of DB connection is needed
// establish connection and return connection pool for querying

// assumption: Any given deployment will only have one RDBMS

// CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

import { Database } from './types' // this is the Database interface we defined earlier
import { Pool } from 'pg'
import { Kysely, PostgresDialect, MssqlDialect } from 'kysely'
import * as tedious from 'tedious'
import * as tarn from 'tarn'

// Environment unpacking
// url?

const pg_dialect = new PostgresDialect({
    pool: new Pool({
        database: 'ecr_viewer_db',
        host: 'localhost',
        user: 'postgres',
        port: 5432,
        max: 10,
    })
})

const ms_dialect = new MssqlDialect({
    tarn: {
      ...tarn,
      options: {
        min: 0,
        max: 10,
      },
    },
    tedious: {
      ...tedious,
      connectionFactory: () => new tedious.Connection({
        authentication: {
          options: {
            password: process.env.SQL_SERVER_PASSWORD,
            userName: process.env.SQL_SERVER_USER,
          },
          type: 'default',
        },
        options: {
          database: 'some_db',
          port: 1433,
          trustServerCertificate: true,
          connectTimeout: 30000,
        },
        server: process.env.SQL_SERVER_HOST || "localhost",
      }),
    },
  })


/**
Determines the dialect for the connection to the database based the METADATA_DATABASE_TYPE environment variable.
*/
const determineDialect = () => {
    switch (process.env.METADATA_DATABASE_TYPE) {
        case 'postgres':
            return pg_dialect
        case 'sqlserver':
            return ms_dialect
        default:
            throw new Error("Invalid database type")
    }
}

// Database interface is passed to Kysely's constructor, and from now on, Kysely
// knows your database structure.
// Dialect is passed to Kysely's constructor, and from now on, Kysely knows how
// to communicate with your database.
export const db = new Kysely<Database>({
    dialect: determineDialect(),
})