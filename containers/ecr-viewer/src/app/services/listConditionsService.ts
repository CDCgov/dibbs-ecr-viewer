import { NO_CONDITIONS_REPORTED_OPTION, USER_TYPE } from "@/app/constants";
import { getDb } from "@/app/data/metadataDb/database";
import {
  ConditionReference,
  Core,
  User,
} from "@/app/data/metadataDb/types/core";
import { Kysely } from "kysely";

import { getCheckAnyAdmin } from "./userService";
import { getLoggedInUser } from "./loggedInUserService";

/**
 * Retrieves all unique conditions from the ecr_rr_conditions table.
 * @returns Array of conditions
 */
export const getAllConditions = async (): Promise<string[]> => {
  const user = await getLoggedInUser();
  if (!user) return [];

  try {
    const db = getDb<Core>();
    return await db.transaction().execute(async (transaction) => {
      const conditionsResult = await transaction
        .selectFrom("ecr_rr_conditions")
        .select("condition")
        .distinct()
        .orderBy("condition")
        .$if(user.user_type !== USER_TYPE.ADMIN, (qb) =>
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

      const actualConditions = conditionsResult.map((row) => row.condition);

      if (user.user_type === USER_TYPE.ADMIN) {
        const hasNoConditionsResult = await transaction
          .selectFrom("ecr_data")
          .leftJoin(
            "ecr_rr_conditions",
            "ecr_data.eicr_id",
            "ecr_rr_conditions.eicr_id",
          )
          .select((eb) => eb.fn.count("ecr_data.eicr_id").as("count"))
          .where("ecr_rr_conditions.uuid", "is", null)
          .executeTakeFirst();

        if (Number(hasNoConditionsResult?.count) > 0) {
          return [NO_CONDITIONS_REPORTED_OPTION, ...actualConditions];
        }
      }

      return actualConditions;
    });
  } catch (error: unknown) {
    console.error("Error fetching data: ", error);
    throw new Error("Error fetching data");
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

/**
 * List condition references visible to an admin. Admins see all conditions;
 * program admins see only conditions assigned to one of their program areas.
 */
export const listAdminConditionReferences = async (): Promise<
  ListedCondition[]
> => {
  const user = await getCheckAnyAdmin("list condition references");

  try {
    return await listAdminConditionReferencesQuery(user, getDb<Core>());
  } catch (error: unknown) {
    const message = "Failed to list accessible condition references";
    console.error({ message, error });
    throw new Error(message);
  }
};

/**
 * Lists condition references accessible to a user.
 * @param user User whose access determines the returned condition references.
 * @param db Database connection used to query condition references.
 * @param codes Optional condition codes used to filter the results.
 * @returns Condition references accessible to the user.
 */
export const listAdminConditionReferencesQuery = async (
  user: User,
  db: Kysely<Core>,
  codes?: string[],
): Promise<ListedCondition[]> => {
  const query = db
    .selectFrom("condition_reference")
    .leftJoin(
      "program_area",
      "condition_reference.program_area_uuid",
      "program_area.uuid",
    )
    .selectAll("condition_reference")
    .select("program_area.name as program_area_name")
    .$if(user.user_type !== "admin", (qb) =>
      qb
        .innerJoin(
          "user_program_area",
          "user_program_area.program_area_uuid",
          "condition_reference.program_area_uuid",
        )
        .where("user_program_area.user_uuid", "=", user.uuid),
    )
    .$if(!!codes, (qb) =>
      qb.where("condition_reference.code", "in", codes ?? []),
    );

  return await query.execute();
};
