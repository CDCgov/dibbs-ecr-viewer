import { db } from "../api/services/database";

/**
 * Retrieves all unique conditions from the ecr_rr_conditions table.
 * @returns Array of conditions
 */
export const getAllConditions = async (): Promise<string[]> => {
  try {
    if (process.env.METADATA_DATABASE_TYPE === undefined) {
      throw Error("Database type is undefined.");
    } else {
      const result = await db.transaction().execute(async (trx) => {
        return await trx.selectFrom('ecr_rr_conditions')
        .select('condition')
        .distinct()
        .orderBy('condition')
        .execute()
      });
      return result.map((row) => row.condition);
    }
  } catch (error: any) {
    console.error("Error fetching data: ", error);
    throw Error("Error fetching data");
  }
};
