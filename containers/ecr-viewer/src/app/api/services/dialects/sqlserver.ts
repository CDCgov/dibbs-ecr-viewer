import { Kysely, MssqlDialect } from "kysely";
import { ConnectionPool } from "mssql";
import * as tarn from "tarn";
import * as tedious from "tedious";

import { Core } from "@/app/api/services/types/core";
import { Extended } from "@/app/api/services/types/extended";

const dbConfig = ConnectionPool.parseConnectionString(
  process.env.DATABASE_URL || "",
);

export const dialect = {
  dialect: new MssqlDialect({
    tarn: {
      ...tarn,
      options: {
        min: dbConfig.pool.min || 0,
        max: dbConfig.pool.max || 100,
      },
    },
    tedious: {
      ...tedious,
      connectionFactory: () => {
        try {
          const res = new tedious.Connection({
            authentication: {
              options: {
                password: dbConfig.password || process.env.SQL_SERVER_PASSWORD,
                userName: dbConfig.user || process.env.SQL_SERVER_USER || "sa",
                domain: dbConfig.domain,
              },
              type: dbConfig.authentication?.type || "default",
            },
            options: {
              database: dbConfig.database || "master",
              port: dbConfig.port || 1433,
              trustServerCertificate: true,
              connectTimeout: dbConfig.connectionTimeout || 3000,
              requestTimeout: dbConfig.requestTimeout,
              ...dbConfig.options,
            },
            server:
              dbConfig.server || process.env.SQL_SERVER_HOST || "localhost",
          });
          res.on("error", (e) => console.log(e));
          return res;
        } catch (e) {
          // kysely eats the errors and just keeps retrying
          console.log(e);
          throw e;
        }
      },
    },
  }),
};

/**
 * construct a sql server db instance
 * @param schema core or extended
 * @returns sql server db instance
 */
export const sqlServerConstructor = (schema: "core" | "extended") => {
  if (schema === "core") {
    return new Kysely<Core>(dialect);
  } else if (schema === "extended") {
    return new Kysely<Extended>(dialect);
  } else {
    throw new Error("Invalid schema type.");
  }
};
