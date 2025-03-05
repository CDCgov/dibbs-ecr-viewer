import { getDB } from "./db/postgres_db";
import { get_pool } from "./db/sqlserver_db";

/**
 * Retrieves all unique conditions from the ecr_rr_conditions table.
 * @returns Array of conditions
 */
export const getAllConditions = async (): Promise<string[]> => {
  const databaseType = process.env.METADATA_DATABASE_TYPE;

  if (databaseType === "postgres") {
    return get_conditions_postgres();
  } else if (databaseType === "sqlserver") {
    return get_conditions_sqlserver();
  } else {
    throw new Error("Database type is undefined.");
  }
};

/**
 * Retrieves all unique conditions from the ecr_rr_conditions table in the PostgreSQL database.
 * @returns Array of conditions
 * @throws An error if it fails to fetch data
 */
const get_conditions_postgres = async (): Promise<string[]> => {
  const { database, pgPromise } = getDB();
  const { ParameterizedQuery: PQ } = pgPromise;

  try {
    const getConditions = new PQ({
      text: 'SELECT DISTINCT "condition" FROM ecr_viewer.ecr_rr_conditions ORDER BY "condition"',
    });
    const conditions = await database.any<{ condition: string }>(getConditions);

    return conditions.map((c) => c.condition);
  } catch (error: unknown) {
    console.error("Error fetching data: ", error);
    throw Error("Error fetching data");
  }
};

/**
 * Retrieves all unique conditions from the ecr_rr_conditions table in the SQL Server database.
 * @returns Array of conditions
 * @throws An error if it fails to fetch data
 */
const get_conditions_sqlserver = async () => {
  try {
    const pool = await get_pool();
    if (!pool) {
      throw Error("Failed to connnect to pool");
    }
    const result = await pool.request().query<{
      condition: string;
    }>("SELECT DISTINCT condition FROM ecr_viewer.ecr_rr_conditions ORDER BY condition");
    return result.recordset.map((row) => row.condition);
  } catch (error: unknown) {
    console.error("Error fetching data: ", error);
    throw Error("Error fetching data");
  }
};
