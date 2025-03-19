import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import pdu, { DatabaseConfig } from "ts-parse-database-url";

const dbConfig: DatabaseConfig = pdu(process.env.DATABASE_URL || "");

import { Core } from "@/app/api/services/types/core";
import { Extended } from "@/app/api/services/types/extended";

export const dialect = {
  dialect: new PostgresDialect({
    pool: new Pool({
      database: dbConfig.database || "ecr_viewer_db",
      host: dbConfig.host || "localhost",
      user: dbConfig.user,
      password: dbConfig.password,
      port: dbConfig.port || 5432,
    }),
  }),
};

/**
 * construct a postgres db instance
 * @param schema core or extended
 * @returns postgres db instance
 */
export const pgConstructor = (schema: "core" | "extended") => {
  if (schema === "core") {
    return new Kysely<Core>(dialect);
  } else if (schema === "extended") {
    return new Kysely<Extended>(dialect);
  } else {
    throw new Error("Invalid schema type.");
  }
};
