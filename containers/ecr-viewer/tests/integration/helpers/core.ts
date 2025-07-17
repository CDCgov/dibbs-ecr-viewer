import { getDb } from "@/app/data/metadataDb/database";
import {
  AuditLog,
  Core,
  NewCoreECR,
  NewECRConditions,
  NewECRRuleSummaries,
} from "@/app/data/metadataDb/types/core";

/**
 * Creates an eICR object
 * @param ecr - the NewECR to be persisted
 * @returns promise
 */
export const createCoreEcr = async (ecr: NewCoreECR): Promise<void> => {
  await getDb<Core>().insertInto("ecr_data").values(ecr).execute();
};

/**
 * Creates an eCR condition object
 * @param condition - the NewECRConditions to be created
 * @returns promise
 */
export const createEcrCondition = async (
  condition: NewECRConditions,
): Promise<void> => {
  await getDb<Core>()
    .insertInto("ecr_rr_conditions")
    .values(condition)
    .execute();
};

/**
 * Creates an eCR rule summary object
 * @param rule_summary - the NewECRRuleSummaries record to be created
 * @returns promise
 */
export const createEcrRule = async (
  rule_summary: NewECRRuleSummaries,
): Promise<void> => {
  await getDb<Core>()
    .insertInto("ecr_rr_rule_summaries")
    .values(rule_summary)
    .execute();
};

export const getLastAuditLog = async (): Promise<AuditLog> => {
  return await getDb<Core>()
    .selectFrom("audit_log")
    .selectAll()
    .orderBy("date desc")
    .fetch(1)
    .offset(0)
    .executeTakeFirstOrThrow();
};
