import { Kysely } from "kysely";

import { Core } from "@/app/api/services/core_types";
import { getDb } from "@/app/api/services/database";
import { Extended } from "@/app/api/services/extended_types";

/**
 * Retrieves all unique conditions from the ecr_rr_conditions table.
 * @returns Array of conditions
 */
export const getAllConditions = async (): Promise<string[]> => {
  try {
    const result = await (getDb() as Kysely<Core | Extended>)
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
