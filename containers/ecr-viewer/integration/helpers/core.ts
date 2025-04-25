import { getDb } from "@/app/api/services/database";
import {
  Core,
  NewCoreECR,
  NewECRConditions,
  NewECRRuleSummaries,
} from "@/app/api/services/types/core";

/**
 * Creates an eICR object
 * @param ecr - the NewECR to be persisted
 * @returns promise
 */
export async function createCoreEcr(ecr: NewCoreECR): Promise<void> {
  await getDb<Core>().insertInto("ecr_data").values(ecr).execute();
}

/**
 * Creates an eCR condition object
 * @param condition - the NewECRConditions to be created
 * @returns promise
 */
export async function createEcrCondition(
  condition: NewECRConditions,
): Promise<void> {
  await getDb<Core>()
    .insertInto("ecr_rr_conditions")
    .values(condition)
    .execute();
}

/**
 * Creates an eCR rule summary object
 * @param rule_summary - the NewECRRuleSummaries record to be created
 * @returns promise
 */
export async function createEcrRule(
  rule_summary: NewECRRuleSummaries,
): Promise<void> {
  await getDb<Core>()
    .insertInto("ecr_rr_rule_summaries")
    .values(rule_summary)
    .execute();
}
