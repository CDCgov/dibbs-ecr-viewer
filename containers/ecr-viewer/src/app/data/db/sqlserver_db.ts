import sql from "mssql";

/**
 * Connect to the SQL Server database and return a connection pool.
 * @returns A promise resolving to a connection pool.
 */
export const get_pool = async () => {
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
      cryptoCredentialsDetails: {
        ciphers: process.env.DB_CIPHER,
      },
    },
  });
};
