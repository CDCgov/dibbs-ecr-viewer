import sql, { ConnectionPool } from "mssql";

/**
 * Connect to the SQL Server database and return a connection pool.
 * @returns A promise resolving to a connection pool.
 */
export const get_pool = async () => {
  const connectionConfig = ConnectionPool.parseConnectionString(
    process.env.DATABASE_URL,
  );
  return await sql.connect({
    ...connectionConfig,
    options: {
      ...connectionConfig.options,
      connectTimeout: 30000,
      cryptoCredentialsDetails: {
        ciphers: process.env.DB_CIPHER,
      },
    },
  });
};

/**
 * Performs a health check on the SQL Server database connection.
 * @returns The status of the SQL Server connection or undefined if missing environment values.
 */
export const sqlServerHealthCheck = async () => {
  if (process.env.METADATA_DATABASE_TYPE !== "sqlserver") {
    return undefined;
  }
  try {
    const pool = await get_pool();
    if (!pool.connected) {
      return "DOWN";
    }
    return "UP";
  } catch (error: unknown) {
    console.error(error);
    return "DOWN";
  }
};
