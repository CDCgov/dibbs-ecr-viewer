import { db } from "./database";
import {
  ExtendedECR,
  NewExtendedECR,
  ExtendedECRUpdate,
  PatientAddress,
  NewPatientAddress,
  PatientAddressUpdate,
  ECRLabs,
  NewECRLabs,
  ECRLabsUpdate,
  ECRConditions,
  NewECRConditions,
  ECRConditionsUpdate,
  ECRRuleSummaries,
  NewECRRuleSummaries,
  ECRRuleSummariesUpdate,
} from "./extended_types";

/**
 * Finds an eICR by its ID
 * @async
 * @function findEcrById
 * @param id - the ID of the ExtendedEcr being looked up
 * @returns an eICR object
 */
export async function findExtendedEcrById(id: string | null) {
  if (!id) {
    return console.error("eICR ID is required.");
  }
  try {
    return await db
      .selectFrom("ecr_data")
      .where("eICR_ID", "=", id)
      .selectAll()
      .executeTakeFirst();
  } catch (error) {
    console.error(error);
  }
}

/**
 * Finds an eICR by its given criteria
 * @async
 * @function findExtendedEcr
 * @param criteria - the Partial<ExtendedECR> filtering criteria
 * @returns an eICR object
 */
export async function findExtendedEcr(criteria: Partial<ExtendedECR> | null) {
  let query = db.selectFrom("ecr_data");

  if (!criteria || criteria === null) {
    return console.error("eICR Criteria is required.");
  }

  if (criteria.eICR_ID) {
    query = query.where("eICR_ID", "=", criteria.eICR_ID);
  }

  if (criteria.set_id) {
    query = query.where("set_id", "=", criteria.set_id);
  }

  if (criteria.fhir_reference_link) {
    query = query.where("set_id", "=", criteria.fhir_reference_link);
  }

  if (criteria.last_name !== undefined) {
    query = query.where(
      "last_name",
      criteria.last_name === null ? "is" : "=",
      criteria.last_name,
    );
  }

  if (criteria.first_name !== undefined) {
    query = query.where("first_name", "=", criteria.first_name);
  }

  if (criteria.fhir_reference_link) {
    query = query.where(
      "fhir_reference_link",
      "=",
      criteria.fhir_reference_link,
    );
  }

  if (criteria.last_name !== undefined) {
    query = query.where(
      "last_name",
      criteria.last_name === null ? "is" : "=",
      criteria.last_name,
    );
  }

  if (criteria.birth_date) {
    query = query.where("birth_date", "=", criteria.birth_date);
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
 * @param ecr - the NewExtendedECR to be persisted
 * @returns the created eICR object
 */
export async function createExtendedEcr(ecr: NewExtendedECR | null) {
  if (!ecr || ecr === null) {
    return console.error("eICR Data is required.");
  }
  try {
    return await db
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
 * @param eICR_ID - the ID of the eICR to be updated
 * @param updateWith - the ECRUpdate to be applied to the existing record
 * @returns the updated eICR object
 */
export async function updateExtendedEcr(
  eICR_ID: string | null,
  updateWith: ExtendedECRUpdate,
) {
  await db
    .updateTable("ecr_data")
    .set(updateWith)
    .where("eICR_ID", "=", eICR_ID)
    .execute();
}

/**
 * Deletes an eICR object
 * @async
 * @function deleteEcr
 * @param eICR_ID - the ID of the eICR to be deleted
 * @returns the deleted eICR object
 */
export async function deleteExtendedEcr(eICR_ID: string | null) {
  const ecr = await findExtendedEcrById(eICR_ID);

  if (ecr) {
    await db.deleteFrom("ecr_data").where("eICR_ID", "=", eICR_ID).execute();
  }

  return ecr;
}

// PATIENT_ADDRESS

/**
 * Finds a patient_address by its ID
 * @async
 * @function findAddressById
 * @param id - the ID of the address record
 * @returns a patient_address object
 */
export async function findAddressById(id: string) {
  return await db
    .selectFrom("patient_address")
    .where("uuid", "=", id)
    .selectAll()
    .executeTakeFirst();
}

/**
 * Finds a patient_address by its criteria
 * @async
 * @function findAddress
 * @param criteria - the Partial<PatientAddress> filtering criteria to be looked up
 * @returns a patient_address object
 */
export async function findAddress(criteria: Partial<PatientAddress>) {
  let query = db.selectFrom("patient_address");

  if (criteria.uuid) {
    query = query.where("uuid", "=", criteria.uuid);
  }

  if (criteria.eICR_ID) {
    query = query.where("eICR_ID", "=", criteria.eICR_ID);
  }

  return await query.selectAll().execute();
}

/**
 * Creates a patient_address object
 * @async
 * @function createAddress
 * @param patient_address - the NewPatientAddress to be persisted
 * @returns the created patient_address object
 */
export async function createAddress(patient_address: NewPatientAddress) {
  if (!patient_address || patient_address === null) {
    return console.error("eICR Data is required.");
  }
  try {
    return await db
      .insertInto("patient_address")
      .values(patient_address)
      .returningAll()
      .executeTakeFirstOrThrow();
  } catch (error) {
    console.error(error);
  }
}

/**
 * Updates a patient_address object
 * @async
 * @function updateAddress
 * @param uuid - the UUID of of the record to be updated
 * @param updateWith - the PatientAddressUpdate to be applied to the existing record
 * @returns the updated patient_address object
 */
export async function updateAddress(
  uuid: string,
  updateWith: PatientAddressUpdate,
) {
  await db
    .updateTable("patient_address")
    .set(updateWith)
    .where("uuid", "=", uuid)
    .execute();
}

/**
 * Deletes a patient_address object
 * @async
 * @function deleteAddress
 * @param uuid - the UUID of the record to be deleted
 * @returns the deleted patient_address object
 */
export async function deleteAddress(uuid: string) {
  const address = await findAddressById(uuid);

  if (address) {
    await db.deleteFrom("patient_address").where("uuid", "=", uuid).execute();
  }

  return address;
}

// ECR_LABS

/**
 * Finds an eCR Lab by its ID
 * @async
 * @function findLabById
 * @param id - the ID of the lab being looked up
 * @returns an eCR Lab object
 */
export async function findLabById(id: string) {
  return await db
    .selectFrom("ecr_labs")
    .where("uuid", "=", id)
    .selectAll()
    .executeTakeFirst();
}

/**
 * Finds an eCR Lab by its criteria
 * @async
 * @function findLab
 * @param criteria - the Partial<ECRLabs> filtering criteria
 * @returns an eCR Lab object
 */
export async function findLab(criteria: Partial<ECRLabs>) {
  let query = db.selectFrom("ecr_labs");

  if (criteria.uuid) {
    query = query.where("uuid", "=", criteria.uuid);
  }

  if (criteria.eICR_ID) {
    query = query.where("eICR_ID", "=", criteria.eICR_ID);
  }

  if (criteria.test_type) {
    query = query.where("test_type", "=", criteria.test_type);
  }

  if (criteria.test_type) {
    query = query.where("test_type", "=", criteria.test_type);
  }

  if (criteria.test_type_code) {
    query = query.where("test_type_code", "=", criteria.test_type_code);
  }

  if (criteria.test_type_system) {
    query = query.where("test_type_system", "=", criteria.test_type_system);
  }

  if (criteria.test_result_qualitative) {
    query = query.where(
      "test_result_qualitative",
      "=",
      criteria.test_result_qualitative,
    );
  }

  if (criteria.test_result_quantitative !== undefined) {
    query = query.where(
      "test_result_quantitative",
      "=",
      criteria.test_result_quantitative,
    );
  }

  if (criteria.test_result_units) {
    query = query.where("test_result_units", "=", criteria.test_result_units);
  }

  if (criteria.test_result_code) {
    query = query.where("test_result_code", "=", criteria.test_result_code);
  }

  if (criteria.test_result_code_display) {
    query = query.where(
      "test_result_code_display",
      "=",
      criteria.test_result_code_display,
    );
  }

  if (criteria.test_result_code_system) {
    query = query.where(
      "test_result_code_system",
      "=",
      criteria.test_result_code_system,
    );
  }

  if (criteria.test_result_interpretation) {
    query = query.where(
      "test_result_interpretation",
      "=",
      criteria.test_result_interpretation,
    );
  }

  if (criteria.test_result_interpretation_code) {
    query = query.where(
      "test_result_interpretation_code",
      "=",
      criteria.test_result_interpretation_code,
    );
  }

  if (criteria.test_result_interpretation_system) {
    query = query.where(
      "test_result_interpretation_system",
      "=",
      criteria.test_result_interpretation_system,
    );
  }

  if (criteria.test_result_reference_range_low_value !== undefined) {
    // Check for null as well
    query = query.where(
      "test_result_reference_range_low_value",
      "=",
      criteria.test_result_reference_range_low_value,
    );
  }

  if (criteria.test_result_reference_range_low_units) {
    query = query.where(
      "test_result_reference_range_low_units",
      "=",
      criteria.test_result_reference_range_low_units,
    );
  }

  if (criteria.test_result_reference_range_high_value !== undefined) {
    // Check for null as well
    query = query.where(
      "test_result_reference_range_high_value",
      "=",
      criteria.test_result_reference_range_high_value,
    );
  }

  if (criteria.test_result_reference_range_high_units) {
    query = query.where(
      "test_result_reference_range_high_units",
      "=",
      criteria.test_result_reference_range_high_units,
    );
  }

  if (criteria.specimen_type) {
    query = query.where("specimen_type", "=", criteria.specimen_type);
  }

  if (criteria.specimen_collection_date) {
    query = query.where(
      "specimen_collection_date",
      "=",
      criteria.specimen_collection_date,
    );
  }

  if (criteria.performing_lab) {
    query = query.where("performing_lab", "=", criteria.performing_lab);
  }
  return await query.selectAll().execute();
}

/**
 * Creates an eCR Lab object
 * @async
 * @param lab - the NewECRLabs to be persisted
 * @function createLab
 * @returns the created eCR Lab object
 */
export async function createLab(lab: NewECRLabs | null) {
  if (!lab || lab === null) {
    return console.error("eICR Lab Data is required.");
  }
  try {
    return await db
      .insertInto("ecr_labs")
      .values(lab)
      .returningAll()
      .executeTakeFirstOrThrow();
  } catch (error) {
    console.error(error);
  }
}

/**
 * Updates an eCR Lab object
 * @async
 * @function updateLab
 * @param uuid - the UUID of the record to be updated
 * @param updateWith - the ECRLapsUpdate to be applied to the existing record
 * @returns the updated eCR Lab object
 */
export async function updateLab(uuid: string, updateWith: ECRLabsUpdate) {
  await db
    .updateTable("ecr_labs")
    .set(updateWith)
    .where("uuid", "=", uuid)
    .execute();
}

/**
 * Deletes an eCR condition object
 * @async
 * @function deleteLab
 * @param uuid - the UUID of the record to be deleted
 * @returns the deleted eCR Lab object
 */
export async function deleteLab(uuid: string) {
  const ecr = await findLabById(uuid);

  if (ecr) {
    await db.deleteFrom("ecr_labs").where("uuid", "=", uuid).execute();
  }

  return ecr;
}

// ECR_RR_CONDITIONS

/**
 * Finds an eCR condition by its ID
 * @async
 * @function findEcrConditionById
 * @param id - the ID of the record being looked up
 * @returns an eCR condition object
 */
export async function findEcrConditionById(id: string) {
  return await db
    .selectFrom("ecr_rr_conditions")
    .where("uuid", "=", id)
    .selectAll()
    .executeTakeFirst();
}

/**
 * Finds an eCR condition by its criteria
 * @async
 * @function findEcrCondition
 * @param criteria - the Partial<ECRConditions> filter to be looked up
 * @returns an eCR condition object
 */
export async function findEcrCondition(criteria: Partial<ECRConditions>) {
  let query = db.selectFrom("ecr_rr_conditions");

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
 * @param condition - the NewECRConditions to be persisted
 * @returns the created eCR condition object
 */
export async function createEcrCondition(condition: NewECRConditions | null) {
  if (!condition || condition === null) {
    return console.error("eICR Data is required.");
  }
  try {
    return await db
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
 * @param uuid - the UUID of the record to be updated
 * @param updateWith - the ECRConditionsUpdate to be applied to the existing record
 * @returns the updated eCR condition object
 */
export async function updateEcrCondition(
  uuid: string,
  updateWith: ECRConditionsUpdate,
) {
  await db
    .updateTable("ecr_rr_conditions")
    .set(updateWith)
    .where("uuid", "=", uuid)
    .execute();
}

/**
 * Deletes an eCR condition object
 * @async
 * @function deleteEcrCondition
 * @param uuid - the UUID of the record to be deleted
 * @returns the deleted eCR condition object
 */
export async function deleteEcrCondition(uuid: string) {
  const ecr = await findEcrConditionById(uuid);

  if (ecr) {
    await db.deleteFrom("ecr_rr_conditions").where("uuid", "=", uuid).execute();
  }

  return ecr;
}

// ECR_RR_RULE_SUMMARIES

/**
 * Finds an eCR rule summary by its ID
 * @async
 * @function findEcrRuleById
 * @param id - the ID of the record being looked up
 * @returns an eCR rule object
 */
export async function findEcrRuleById(id: string) {
  return await db
    .selectFrom("ecr_rr_rule_summaries")
    .where("uuid", "=", id)
    .selectAll()
    .executeTakeFirst();
}

/**
 * Finds an eCR rule summary by its criteria
 * @async
 * @function findEcrRule
 * @param criteria - the Parcial<ECRRuleSummaries> to filter the record being looked up
 * @returns an eCR rule object
 */
export async function findEcrRule(criteria: Partial<ECRRuleSummaries>) {
  let query = db.selectFrom("ecr_rr_rule_summaries");

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
 * @function createEcrRule
 * @param rule_summary - the NewECRRuleSummaries to be persisted
 * @returns the created eCR rule object
 */
export async function createEcrRule(rule_summary: NewECRRuleSummaries) {
  if (!rule_summary || rule_summary === null) {
    return console.error("eICR Data is required.");
  }
  try {
    return await db
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
 * @param uuid - the UUID of the record being updated
 * @param updateWith - the ECRRuleSummariesUpdate to be applied to the existing record
 * @returns the updated eCR rule object
 */
export async function updateEcrRule(
  uuid: string,
  updateWith: ECRRuleSummariesUpdate,
) {
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
 * @param uuid - the UUID of the record to be deleted
 * @returns the deleted eCR rule object
 */
export async function deleteEcrRule(uuid: string) {
  const rule_summary = await findEcrRuleById(uuid);

  if (rule_summary) {
    await db
      .deleteFrom("ecr_rr_rule_summaries")
      .where("uuid", "=", uuid)
      .execute();
  }

  return rule_summary;
}
