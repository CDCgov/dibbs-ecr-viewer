import { Kysely } from "kysely";

import { getDb } from "@/app/api/services/database";
import {
  Common,
  NewECRConditions,
  NewECRRuleSummaries,
} from "@/app/api/services/types/common";

const db = () => getDb() as unknown as Kysely<Common>;

/**
 * Creates an eCR condition object
 * @param condition - the NewECRConditions to be created
 * @returns the created eCR condition object
 */
export async function createEcrCondition(
  condition: NewECRConditions,
): Promise<void> {
  await db().insertInto("ecr_rr_conditions").values(condition).execute();
}

/**
 * Creates an eCR rule summary object
 * @param rule_summary - the NewECRRuleSummaries record to be created
 * @returns the created eCR rule object
 */
export async function createEcrRule(
  rule_summary: NewECRRuleSummaries,
): Promise<void> {
  await db().insertInto("ecr_rr_rule_summaries").values(rule_summary).execute();
}
