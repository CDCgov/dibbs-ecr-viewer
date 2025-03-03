import { db } from "./database";
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
} from "./types";
import { Kysely } from "kysely";
import { Core } from "./types";

// ECR_DATA

/**
 * Finds an eICR by its ID
 * @async
 * @function findEcrById
 * @param id - thd ID of the eCR to be looked up
 * @returns an eICR object
 */
export async function findEcrById(id: string | null) {
  if (!id) {
    return console.error("eICR ID is required.");
  }
  try {
    return await (db as Kysely<Core>)
      .selectFrom("ecr_data")
      .where("eICR_ID", "=", id)
      .selectAll()
      .executeTakeFirst();
  } catch (error) {
    console.error(error);
  }
}

/**
 * Finds an eICR by its criteria
 * @async
 * @function findEcr
 * @param criteria - the Partial<ECR> used to filter against
 * @returns an eICR object
 */
export async function findEcr(criteria: Partial<ECR> | null) {
  let query = (db as Kysely<Core>).selectFrom("ecr_data");

  if (!criteria || criteria === null) {
    return console.error("eICR Criteria is required.");
  }

  if (criteria.eICR_ID) {
    query = query.where("eICR_ID", "=", criteria.eICR_ID);
  }

  if (criteria.set_id) {
    query = query.where("set_id", "=", criteria.set_id);
  }

  if (criteria.data_source) {
    query = query.where("data_source", "=", criteria.data_source);
  }

  if (criteria.fhir_reference_link) {
    query = query.where(
      "fhir_reference_link",
      "=",
      criteria.fhir_reference_link,
    );
  }

  if (criteria.patient_name_last !== undefined) {
    query = query.where(
      "patient_name_last",
      criteria.patient_name_last === null ? "is" : "=",
      criteria.patient_name_last,
    );
  }

  if (criteria.patient_birth_date) {
    query = query.where("patient_birth_date", "=", criteria.patient_birth_date);
  }

  if (criteria.date_created) {
    query = query.where("date_created", "=", criteria.date_created);
  }

  return await query.selectAll().execute();
}

/**
 * Creates an eICR object
 * @async
 * @function createEcr
 * @param ecr - the NewECR to be persisted
 * @returns the created eICR object
 */
export async function createEcr(ecr: NewECR | null) {
  if (!ecr || ecr === null) {
    return console.error("eICR Data is required.");
  }
  try {
    return await (db as Kysely<Core>)
      .insertInto("ecr_data")
      .values(ecr)
      .returningAll()
      .executeTakeFirstOrThrow();
  } catch (error) {
    console.error(error);
  }
}

/**
 * Updates an eICR object
 * @async
 * @function updateEcr
 * @param eICR_ID - the eICR_ID of the eCR to be updated
 * @param updateWith - the ECRUpdate to be applied to the existing record
 * @returns the updated eICR object
 */
export async function updateEcr(eICR_ID: string | null, updateWith: ECRUpdate) {
  await (db as Kysely<Core>)
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
export async function deleteEcr(eICR_ID: string | null) {
  const ecr = await findEcrById(eICR_ID);

  if (ecr) {
    await (db as Kysely<Core>).deleteFrom("ecr_data").where("eICR_ID", "=", eICR_ID).execute();
  }

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
export async function findEcrConditionById(id: string) {
  return await (db as Kysely<Core>)
    .selectFrom("ecr_rr_conditions")
    .where("uuid", "=", id)
    .selectAll()
    .executeTakeFirst();
}

/**
 * Finds an eCR condition by its criteria
 * @async
 * @function findEcrCondition
 * @param criteria - the Partial<ECRConditions> filtering criteria to be applied
 * @returns an eCR condition object
 */
export async function findEcrCondition(criteria: Partial<ECRConditions>) {
  let query = (db as Kysely<Core>).selectFrom("ecr_rr_conditions");

  if (criteria.uuid) {
    query = query.where("uuid", "=", criteria.uuid);
  }

  if (criteria.eICR_ID) {
    query = query.where("eICR_ID", "=", criteria.eICR_ID);
  }

  if (criteria.condition) {
    query = query.where("condition", "=", criteria.condition);
  }

  return await query.selectAll().execute();
}

/**
 * Creates an eCR condition object
 * @async
 * @function createEcrCondition
 * @param condition - the NewECRConditions to be created
 * @returns the created eCR condition object
 */
export async function createEcrCondition(condition: NewECRConditions | null) {
  if (!condition || condition === null) {
    return console.error("eICR Data is required.");
  }
  try {
    return await (db as Kysely<Core>)
      .insertInto("ecr_rr_conditions")
      .values(condition)
      .returningAll()
      .executeTakeFirstOrThrow();
  } catch (error) {
    console.error(error);
  }
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
) {
  await (db as Kysely<Core>)
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
export async function deleteEcrCondition(uuid: string) {
  const ecr = await findEcrConditionById(uuid);

  if (ecr) {
    await (db as Kysely<Core>).deleteFrom("ecr_rr_conditions").where("uuid", "=", uuid).execute();
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
export async function findEcrRuleById(id: string) {
  return await (db as Kysely<Core>)
    .selectFrom("ecr_rr_rule_summaries")
    .where("uuid", "=", id)
    .selectAll()
    .executeTakeFirst();
}

/**
 * Finds an eCR rule summary by its criteria
 * @async
 * @function findEcrRule
 * @param criteria - the Partial<ECRRuleSummaries> filtering criteria
 * @returns an eCR rule object
 */
export async function findEcrRule(criteria: Partial<ECRRuleSummaries>) {
  let query = (db as Kysely<Core>).selectFrom("ecr_rr_rule_summaries");

  if (criteria.uuid) {
    query = query.where("uuid", "=", criteria.uuid);
  }

  if (criteria.ecr_rr_conditions_id) {
    query = query.where(
      "ecr_rr_conditions_id",
      "=",
      criteria.ecr_rr_conditions_id,
    );
  }

  if (criteria.rule_summary) {
    query = query.where("rule_summary", "=", criteria.rule_summary);
  }

  return await query.selectAll().execute();
}

/**
 * Creates an eCR rule summary object
 * @async
 * @param rule_summary - the NewECRRuleSummaries record to be created
 * @function createEcrRule
 * @returns the created eCR rule object
 */
export async function createEcrRule(rule_summary: NewECRRuleSummaries) {
  if (!rule_summary || rule_summary === null) {
    return console.error("eICR Data is required.");
  }
  try {
    return await (db as Kysely<Core>)
      .insertInto("ecr_rr_rule_summaries")
      .values(rule_summary)
      .returningAll()
      .executeTakeFirstOrThrow();
  } catch (error) {
    console.error(error);
  }
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
) {
  await (db as Kysely<Core>)
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
export async function deleteEcrRule(uuid: string) {
  const rule_summary = await findEcrRuleById(uuid);

  if (rule_summary) {
    await (db as Kysely<Core>)
      .deleteFrom("ecr_rr_rule_summaries")
      .where("uuid", "=", uuid)
      .execute();
  }

  return rule_summary;
}
