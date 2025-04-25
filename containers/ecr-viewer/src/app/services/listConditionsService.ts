import { getDb } from "@/app/data/metadataDb/database";
import { Core } from "@/app/data/metadataDb/types/core";

/**
 * Retrieves all unique conditions from the ecr_rr_conditions table.
 * @returns Array of conditions
 */
export const getAllConditions = async (): Promise<string[]> => {
  try {
    const result = await getDb<Core>()
      .selectFrom("ecr_rr_conditions")
      .select("condition")
      .distinct()
      .orderBy("condition")
      .execute();
    return result.map((row) => row.condition);
  } catch (error: unknown) {
    console.error("Error fetching data: ", error);
    throw new Error("Error fetching data");
  }
};
