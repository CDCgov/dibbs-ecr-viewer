import { PostgresDialect } from "kysely";
import { Pool } from "pg";

export const dialect = {
  dialect: new PostgresDialect({
    pool: new Pool({ connectionString: process.env.DATABASE_URL }),
  }),
};
