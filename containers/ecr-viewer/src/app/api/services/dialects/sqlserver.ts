import { MssqlDialect } from "kysely";
import * as tarn from "tarn";
import * as tedious from "tedious";

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
                password: process.env.SQL_SERVER_PASSWORD,
                userName: process.env.SQL_SERVER_USER || "sa",
              },
              type: "default",
            },
            options: {
              database: "master",
              port: 1433,
              trustServerCertificate: true,
              connectTimeout: 3000,
            },
            server: process.env.SQL_SERVER_HOST || "localhost",
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
