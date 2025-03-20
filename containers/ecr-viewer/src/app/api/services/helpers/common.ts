import { Kysely } from "kysely";

import { getDb } from "@/app/api/services/database";
import {
  Common,
  NewECRConditions,
  ECRConditionsUpdate,
  NewECRRuleSummaries,
} from "@/app/api/services/types/common";

const db = () => getDb() as unknown as Kysely<Common>;

/**
 * Creates an eCR condition object
 * @async
 * @function createEcrCondition
 * @param condition - the NewECRConditions to be created
 * @returns the created eCR condition object
 */
export async function createEcrCondition(
  condition: NewECRConditions | null,
): Promise<void> {
  if (!condition) {
    throw new Error("eICR Data is required.");
  }
  await db().insertInto("ecr_rr_conditions").values(condition).execute();
}

/**
 * Updates an eCR condition object
 * @async
 * @function updateEcrCondition
 * @param uuid - the UUID of the eCR Condition to be updated
 * @param updateWith - the ECRConditionsUpdate to be applied
 * @returns the updated eCR condition object
 */
export async function updateEcrCondition(
  uuid: string,
  updateWith: ECRConditionsUpdate,
): Promise<void> {
  await db()
    .updateTable("ecr_rr_conditions")
    .set(updateWith)
    .where("uuid", "=", uuid)
    .execute();
}

/**
 * Creates an eCR rule summary object
 * @async
 * @param rule_summary - the NewECRRuleSummaries record to be created
 * @function createEcrRule
 * @returns the created eCR rule object
 */
export async function createEcrRule(
  rule_summary: NewECRRuleSummaries,
): Promise<void> {
  if (!rule_summary) {
    throw new Error("eICR Data is required.");
  }
  await db().insertInto("ecr_rr_rule_summaries").values(rule_summary).execute();
}
