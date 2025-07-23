import { getDb } from "@/app/data/metadataDb/database";
import { ConditionReference, Core } from "@/app/data/metadataDb/types/core";

import { getLoggedInUser } from "./userService";

/**
 * Retrieves all unique conditions from the ecr_rr_conditions table.
 * @returns Array of conditions
 */
export const getAllConditions = async (): Promise<string[]> => {
  const user = await getLoggedInUser();
  if (!user) return [];

  try {
    const result = await getDb<Core>()
      .selectFrom("ecr_rr_conditions")
      .select("condition")
      .distinct()
      .orderBy("condition")
      .$if(user.user_type !== "admin", (qb) =>
        qb
          .innerJoin(
            "condition_reference",
            "condition_reference.code",
            "ecr_rr_conditions.condition_code",
          )
          .innerJoin(
            "program_area",
            "program_area.uuid",
            "condition_reference.program_area_uuid",
          )
          .innerJoin(
            "user_program_area",
            "user_program_area.program_area_uuid",
            "program_area.uuid",
          )
          .where("user_program_area.user_uuid", "=", user.uuid),
      )
      .execute();

    const actualConditions = result.map((row) => row.condition);

    const hasEcrsWithNoConditions = await checkForEcrsWithNoConditions();
    
    if (hasEcrsWithNoConditions) {
      return ["No conditions reported", ...actualConditions];
    }
    
    return actualConditions;
  } catch (error: unknown) {
    console.error("Error fetching data: ", error);
    throw new Error("Error fetching data");
  }
};

const checkForEcrsWithNoConditions = async (): Promise<boolean> => {
  try {
    const db = getDb<Core>();
    
    const allEcrIds = await db
      .selectFrom("ecr_data")
      .select("eicr_id")
      .execute();

    const ecrIdsWithConditions = await db
      .selectFrom("ecr_rr_conditions")
      .select("eicr_id")
      .distinct()
      .execute();

    const ecrIdsWithConditionsSet = new Set(
      ecrIdsWithConditions.map(row => row.eicr_id)
    );
    
    // Check if any eCRs have no conditions
    return allEcrIds.some(row => !ecrIdsWithConditionsSet.has(row.eicr_id));
  } catch (error: unknown) {
    console.error("Error checking for eCRs with no conditions: ", error);
    return false;
  }
};

export interface ListedCondition extends ConditionReference {
  program_area_name: string | null;
}

/**
 * List all conditions in the reference table.
 * @returns list of all conditions
 */
export const listConditionReferences = async (): Promise<ListedCondition[]> => {
  try {
    return await getDb<Core>()
      .selectFrom("condition_reference")
      .leftJoin(
        "program_area",
        "condition_reference.program_area_uuid",
        "program_area.uuid",
      )
      .selectAll("condition_reference")
      .select("program_area.name as program_area_name")
      .execute();
  } catch (error: unknown) {
    const message = "Failed to list condition references";
    console.error({ message, error });
    throw new Error(message);
  }
};
