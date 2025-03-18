import { Kysely } from "kysely";

import {
  ECRConditions,
  NewECRConditions,
  ECRConditionsUpdate,
  ECRRuleSummaries,
  NewECRRuleSummaries,
  ECRRuleSummariesUpdate,
  ECR,
  NewECR,
  ECRUpdate,
  Core,
} from "./core_types";
import { getDb } from "./database";

const coredb = () => getDb() as Kysely<Core>;

// ECR_DATA

/**
 * Finds an eICR by its ID
 * @async
 * @function findEcrById
 * @param id - thd ID of the eCR to be looked up
 * @returns an eICR object
 */
export async function findEcrById(id: string | null): Promise<ECR | undefined> {
  if (!id) {
    throw new Error("eICR ID is required.");
  }
  try {
    return (await coredb()
      .selectFrom("ecr_data")
      .where("eICR_ID", "=", id)
      .selectAll()
      .executeTakeFirst()) as ECR;
  } catch (error) {
    throw new Error("eICR not found.");
  }
}

/**
 * Finds an eICR by its criteria
 * @async
 * @function findEcr
 * @param criteria - the Partial<ECR> used to filter against
 * @returns an eICR object
 */
export async function findEcr(criteria: Partial<ECR> | null): Promise<ECR[]> {
  let query = coredb().selectFrom("ecr_data");

  if (!criteria) {
    throw new Error("eICR Criteria is required.");
  }

  for (const criterium of Object.keys(criteria) as (keyof ECR)[]) {
    // GOES TO HELPER FUNCTION
    if (criteria[criterium] !== undefined && criteria[criterium] !== null) {
      query = query.where(criterium, "=", criteria[criterium]);
    }
  }

  return (await query.selectAll().execute()) as ECR[];
}

/**
 * Creates an eICR object
 * @async
 * @function createEcr
 * @param ecr - the NewECR to be persisted
 * @returns the created eICR object
 */
export async function createEcr(ecr: NewECR | null): Promise<void> {
  if (!ecr) {
    throw new Error("eICR Data is required.");
  }
  await coredb().insertInto("ecr_data").values(ecr).execute();
}

/**
 * Updates an eICR object
 * @async
 * @function updateEcr
 * @param eICR_ID - the eICR_ID of the eCR to be updated
 * @param updateWith - the ECRUpdate to be applied to the existing record
 * @returns the updated eICR object
 */
export async function updateEcr(
  eICR_ID: string | null,
  updateWith: ECRUpdate,
): Promise<void> {
  await coredb()
    .updateTable("ecr_data")
    .set(updateWith)
    .where("eICR_ID", "=", eICR_ID)
    .execute();
}

/**
 * Deletes an eICR object
 * @async
 * @function deleteEcr
 * @param eICR_ID - the eICR_ID of the record to be deleted
 * @returns the deleted eICR object
 */
export async function deleteEcr(
  eICR_ID: string | null,
): Promise<ECR | undefined> {
  const ecr = await findEcrById(eICR_ID);

  if (!ecr) {
    return undefined;
  }

  await coredb()
    .deleteFrom("ecr_data")
    .where("eICR_ID", "=", eICR_ID)
    .execute();

  return ecr;
}

// ECR_RR_CONDITIONS

/**
 * Finds an eCR condition by its ID
 * @async
 * @function findEcrConditionById
 * @param id - the UUID of the eCR condition being looked up
 * @returns an eCR condition object
 */
export async function findEcrConditionById(
  id: string,
): Promise<ECRConditions | undefined> {
  return (await coredb()
    .selectFrom("ecr_rr_conditions")
    .where("uuid", "=", id)
    .selectAll()
    .executeTakeFirst()) as ECRConditions;
}

/**
 * Finds an eCR condition by its criteria
 * @async
 * @function findEcrCondition
 * @param criteria - the Partial<ECRConditions> filtering criteria to be applied
 * @returns an eCR condition object
 */
export async function findEcrCondition(
  criteria: Partial<ECRConditions>,
): Promise<ECRConditions[]> {
  let query = coredb().selectFrom("ecr_rr_conditions");

  for (const criterium of Object.keys(criteria) as (keyof ECRConditions)[]) {
    if (criteria[criterium] !== undefined && criteria[criterium] !== null) {
      query = query.where(criterium, "=", criteria[criterium]);
    }
  }

  return (await query.selectAll().execute()) as ECRConditions[];
}

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
  console.log({ condition });
  await coredb().insertInto("ecr_rr_conditions").values(condition).execute();
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
  await coredb()
    .updateTable("ecr_rr_conditions")
    .set(updateWith)
    .where("uuid", "=", uuid)
    .execute();
}

/**
 * Deletes an eCR condition object
 * @async
 * @function deleteEcrCondition
 * @param uuid - thge UUID of the record to be deleted
 * @returns the deleted eCR condition object
 */
export async function deleteEcrCondition(
  uuid: string,
): Promise<ECRConditions | undefined> {
  const ecr = await findEcrConditionById(uuid);

  if (ecr) {
    await coredb()
      .deleteFrom("ecr_rr_conditions")
      .where("uuid", "=", uuid)
      .execute();
  }

  return ecr;
}

// ECR_RR_RULE_SUMMARIES

/**
 * Finds an eCR rule summary by its ID
 * @async
 * @function findEcrRuleById
 * @param id - the ID of the eCR being looked up
 * @returns an eCR rule object
 */
export async function findEcrRuleById(
  id: string,
): Promise<ECRRuleSummaries | undefined> {
  return (await coredb()
    .selectFrom("ecr_rr_rule_summaries")
    .where("uuid", "=", id)
    .selectAll()
    .executeTakeFirst()) as ECRRuleSummaries;
}

/**
 * Finds an eCR rule summary by its criteria
 * @async
 * @function findEcrRule
 * @param criteria - the Partial<ECRRuleSummaries> filtering criteria
 * @returns an eCR rule object
 */
export async function findEcrRule(
  criteria: Partial<ECRRuleSummaries>,
): Promise<ECRRuleSummaries[]> {
  let query = coredb().selectFrom("ecr_rr_rule_summaries");

  for (const criterium of Object.keys(criteria) as (keyof ECRRuleSummaries)[]) {
    if (criteria[criterium] !== undefined && criteria[criterium] !== null) {
      query = query.where(criterium, "=", criteria[criterium]);
    }
  }

  return (await query.selectAll().execute()) as ECRRuleSummaries[];
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
  await coredb()
    .insertInto("ecr_rr_rule_summaries")
    .values(rule_summary)
    .execute();
}

/**
 * Updates an eCR rule summary object
 * @async
 * @function updateEcrRule
 * @param uuid - the UUID of the eCR rule to be updated
 * @param updateWith - the ECRRuleSummariesUpdate to be applied to the record
 * @returns the updated eCR rule object
 */
export async function updateEcrRule(
  uuid: string,
  updateWith: ECRRuleSummariesUpdate,
): Promise<void> {
  const db = coredb();
  await db
    .updateTable("ecr_rr_rule_summaries")
    .set(updateWith)
    .where("uuid", "=", uuid)
    .execute();
}

/**
 * Deletes an eCR rule summary object
 * @async
 * @function deleteEcrRule
 * @param uuid - the UUID of the eCR rule to be deleted
 * @returns the deleted eCR rule object
 */
export async function deleteEcrRule(
  uuid: string,
): Promise<ECRRuleSummaries | undefined> {
  const rule_summary = await findEcrRuleById(uuid);

  if (rule_summary) {
    const db = coredb();
    await db
      .deleteFrom("ecr_rr_rule_summaries")
      .where("uuid", "=", uuid)
      .execute();
  }

  return rule_summary;
}
