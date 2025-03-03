import sql from "mssql";

/**
 * Connect to the SQL Server database and return a connection pool.
 * @returns A promise resolving to a connection pool.
 */
export const get_pool = async () => {
  const ciphers = [
    "TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA384", // Testing this one
    // "DEFAULT@SECLEVEL=0", // Works with any tlsciphers value
    // "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256",
    "ECDHE-RSA-AES256-SHA384",
  ].join(":");
  return await sql.connect({
    user: process.env.SQL_SERVER_USER,
    password: process.env.SQL_SERVER_PASSWORD,
    server: process.env.SQL_SERVER_HOST || "localhost",
    pool: {
      min: 1,
    },
    options: {
      trustServerCertificate: true,
      connectTimeout: 30000,
      encrypt: true,
      cryptoCredentialsDetails: {
        ciphers,
        // ciphers: process.env.DB_CIPHER,
      },
    },
    beforeConnect: (conn) => {
      conn.on("debug", function (text) {
        console.log(text);
      });
    },
  });
};

/**
 * Performs a health check on the SQL Server database connection.
 * @returns The status of the SQL Server connection or undefined if missing environment values.
 */
export const sqlServerHealthCheck = async () => {
  if (
    !process.env.SQL_SERVER_HOST ||
    !process.env.SQL_SERVER_USER ||
    !process.env.SQL_SERVER_PASSWORD
  ) {
    return undefined;
  }
  try {
    await get_pool();
    return "UP";
  } catch (error: unknown) {
    console.error(error);
    return "DOWN";
  }
};
