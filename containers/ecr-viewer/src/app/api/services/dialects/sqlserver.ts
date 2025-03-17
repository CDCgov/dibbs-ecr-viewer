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
        const opts = {
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
            // debug: {
            //   packet: true,
            //   data: true,
            //   payload: true,
            //   token: true,
            // }
          },
          server: process.env.SQL_SERVER_HOST || "localhost",
        };
        try {
          const { Connection } = tedious;
          const res = new Connection(opts);
          res.on("error", (e) => console.log({ e }));
          return res;
        } catch (e) {
          console.log({ e });
          throw e;
        }
      },
    },
  }),
};
