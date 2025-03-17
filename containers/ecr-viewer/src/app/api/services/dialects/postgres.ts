import { PostgresDialect } from "kysely";
import { Pool } from "pg";

export const dialect = {
  dialect: new PostgresDialect({
    pool: new Pool({
      database: process.env.POSTGRES_DATABASE || "ecr_viewer_db",
      host: process.env.POSTGRES_HOST,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      port: parseInt(process.env.POSTGRES_PORT || "5432"),
      max: parseInt(process.env.POSTGRES_MAX_THREADPOOL || "10"),
    }),
  }),
};
