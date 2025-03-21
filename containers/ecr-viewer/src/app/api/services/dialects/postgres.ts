import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

import { Core } from "@/app/api/services/types/core";
import { Extended } from "@/app/api/services/types/extended";

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
