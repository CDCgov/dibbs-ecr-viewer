import { Kysely, MssqlDialect } from "kysely";
import * as tarn from "tarn";
import * as tedious from "tedious";
import parse from "mssql-connection-string";

const dbConfig = parse(process.env.DATABASE_URL || "");

import { Core } from "@/app/api/services/types/core";
import { Extended } from "@/app/api/services/types/extended";

export const dialect = {
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
      connectionFactory: () => {
        try {
          const res = new tedious.Connection({
            authentication: {
              options: {
                password: dbConfig.password,
                userName: dbConfig.user || "sa",
              },
              type: "default",
            },
            options: {
              database: dbConfig.database || "master",
              port: parseInt(dbConfig.options.port || "1433"),
              trustServerCertificate: true,
              connectTimeout: 3000,
            },
            server: dbConfig.server || "localhost",
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
