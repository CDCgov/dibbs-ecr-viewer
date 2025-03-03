import { db } from "@/app/api/services/database";
import { Kysely } from "kysely";
import { Extended } from "@/app/api/services/extended_types";

/**
 * Retrieves all unique conditions from the ecr_rr_conditions table.
 * @returns Array of conditions
 */
export const getAllConditions = async (): Promise<string[]> => {
  if (process.env.METADATA_DATABASE_TYPE === undefined) {
    throw Error("Database type is undefined.");
  } else {
    try {
      const result = await (db as Kysely<Extended>).transaction().execute(async (trx) => { // Possible fetch errors if using Core since this applies for both?
        return await trx
          .selectFrom("ecr_rr_conditions")
          .select("condition")
          .distinct()
          .orderBy("condition")
          .execute();
      });
      return result.map((row: { condition: string }) => row.condition);
    } catch (error: unknown) {
      console.error("Error fetching data: ", error);
      throw new Error("Error fetching data");
    }
  }
};
