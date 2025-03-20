import { Kysely } from "kysely";

import { getDb } from "./database";
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
  Extended,
} from "./extended_types";

const extdb = () => getDb() as Kysely<Extended>;

/**
 * Finds an eICR by its ID
 * @async
 * @function findEcrById
 * @param id - the ID of the ExtendedEcr being looked up
 * @returns an eICR object
 */
export async function findExtendedEcrById(
  id: string | null,
): Promise<ExtendedECR | undefined> {
  if (!id) {
    throw new Error("eICR ID is required.");
  }
  try {
    const val = await extdb()
      .selectFrom("ecr_data")
      .where("eICR_ID", "=", id)
      .selectAll()
      .executeTakeFirst();
    // Type conversion
    if (val && val.latitude !== undefined) {
      val.latitude = parseFloat(val.latitude.toString());
    }
    if (val && val.longitude !== undefined) {
      val.longitude = parseFloat(val.longitude.toString());
    }

    return val as ExtendedECR;
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
export async function findExtendedEcr(
  criteria: Partial<ExtendedECR> | null,
): Promise<ExtendedECR[]> {
  let query = extdb().selectFrom("ecr_data");

  if (!criteria || criteria === null) {
    throw new Error("eICR Criteria is required.");
  }

  for (const criterium of Object.keys(criteria) as (keyof ExtendedECR)[]) {
    if (criteria[criterium] !== undefined && criteria[criterium] !== null) {
      query = query.where(criterium, "=", criteria[criterium]);
    }
  }

  const vals = await query.selectAll().execute();
  for (const val of vals) {
    if (val && val.latitude !== undefined) {
      val.latitude = parseFloat(val.latitude.toString());
    }
    if (val && val.longitude !== undefined) {
      val.longitude = parseFloat(val.longitude.toString());
    }
  }

  return vals as ExtendedECR[];
}

/**
 * Creates an eICR object
 * @async
 * @function createEcr
 * @param ecr - the NewExtendedECR to be persisted
 * @returns the created eICR object
 */
export async function createExtendedEcr(
  ecr: NewExtendedECR | null,
): Promise<void> {
  if (!ecr || ecr === null) {
    throw new Error("eICR Data is required.");
  }
  await extdb().insertInto("ecr_data").values(ecr).execute();
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
): Promise<void> {
  await extdb()
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
export async function deleteExtendedEcr(
  eICR_ID: string,
): Promise<ExtendedECR | undefined> {
  const ecr = await findExtendedEcrById(eICR_ID);
  if (!ecr) {
    throw new Error("Cannot find ECR with given ID.");
  }
  if (ecr) {
    await extdb()
      .deleteFrom("ecr_data")
      .where("eICR_ID", "=", eICR_ID)
      .execute();
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
export async function findAddressById(
  id: string,
): Promise<PatientAddress | undefined> {
  const val = await extdb()
    .selectFrom("patient_address")
    .where("uuid", "=", id)
    .selectAll()
    .executeTakeFirst();

  return val as PatientAddress;
}

/**
 * Finds a patient_address by its criteria
 * @async
 * @function findAddress
 * @param criteria - the Partial<PatientAddress> filtering criteria to be looked up
 * @returns a patient_address object
 */
export async function findAddress(
  criteria: Partial<PatientAddress>,
): Promise<PatientAddress[]> {
  let query = extdb().selectFrom("patient_address");

  for (const criterium of Object.keys(criteria) as (keyof PatientAddress)[]) {
    if (criteria[criterium] !== undefined && criteria[criterium] !== null) {
      query = query.where(criterium, "=", criteria[criterium]);
    }
  }

  return (await query.selectAll().execute()) as PatientAddress[];
}

/**
 * Creates a patient_address object
 * @async
 * @function createAddress
 * @param patient_address - the NewPatientAddress to be persisted
 * @returns the created patient_address object
 */
export async function createAddress(
  patient_address: NewPatientAddress,
): Promise<void> {
  if (!patient_address || patient_address === null) {
    throw new Error("eICR Data is required.");
  }
  await extdb().insertInto("patient_address").values(patient_address).execute();
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
): Promise<void> {
  await extdb()
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
export async function deleteAddress(
  uuid: string,
): Promise<PatientAddress | undefined> {
  const address = await findAddressById(uuid);

  if (address) {
    await extdb()
      .deleteFrom("patient_address")
      .where("uuid", "=", uuid)
      .execute();
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
export async function findLabById(id: string): Promise<ECRLabs | undefined> {
  const val = await extdb()
    .selectFrom("ecr_labs")
    .where("uuid", "=", id)
    .selectAll()
    .executeTakeFirst();
  if (!val) {
    return undefined;
  }
  if (
    val.test_result_quantitative !== undefined &&
    val.test_result_quantitative !== null
  ) {
    val.test_result_quantitative = parseFloat(
      val.test_result_quantitative.toString(),
    );
  }
  if (
    val.test_result_reference_range_high_value !== undefined &&
    val.test_result_reference_range_high_value !== null
  ) {
    val.test_result_reference_range_high_value = parseFloat(
      val.test_result_reference_range_high_value.toString(),
    );
  }
  if (
    val.test_result_reference_range_low_value !== undefined &&
    val.test_result_reference_range_low_value !== null
  ) {
    val.test_result_reference_range_low_value = parseFloat(
      val.test_result_reference_range_low_value.toString(),
    );
  }
  return val as ECRLabs;
}

/**
 * Finds an eCR Lab by its criteria
 * @async
 * @function findLab
 * @param criteria - the Partial<ECRLabs> filtering criteria
 * @returns an eCR Lab object
 */
export async function findLab(criteria: Partial<ECRLabs>): Promise<ECRLabs[]> {
  let query = extdb().selectFrom("ecr_labs");

  for (const criterium of Object.keys(criteria) as (keyof ECRLabs)[]) {
    if (criteria[criterium] !== undefined && criteria[criterium] !== null) {
      query = query.where(criterium, "=", criteria[criterium]);
    }
  }
  const vals = await query.selectAll().execute();
  for (const val of vals) {
    if (
      val.test_result_quantitative !== undefined &&
      val.test_result_quantitative !== null
    ) {
      val.test_result_quantitative = parseFloat(
        val.test_result_quantitative.toString(),
      );
    }
    if (
      val.test_result_reference_range_high_value !== undefined &&
      val.test_result_reference_range_high_value !== null
    ) {
      val.test_result_reference_range_high_value = parseFloat(
        val.test_result_reference_range_high_value.toString(),
      );
    }
    if (
      val.test_result_reference_range_low_value !== undefined &&
      val.test_result_reference_range_low_value !== null
    ) {
      val.test_result_reference_range_low_value = parseFloat(
        val.test_result_reference_range_low_value.toString(),
      );
    }
  }
  return vals as ECRLabs[];
}

/**
 * Creates an eCR Lab object
 * @async
 * @param lab - the NewECRLabs to be persisted
 * @function createLab
 * @returns the created eCR Lab object
 */
export async function createLab(lab: NewECRLabs | null): Promise<void> {
  if (!lab || lab === null) {
    throw new Error("eICR Lab Data is required.");
  }
  await extdb().insertInto("ecr_labs").values(lab).execute();
}

/**
 * Updates an eCR Lab object
 * @async
 * @function updateLab
 * @param uuid - the UUID of the record to be updated
 * @param updateWith - the ECRLapsUpdate to be applied to the existing record
 * @returns the updated eCR Lab object
 */
export async function updateLab(
  uuid: string,
  updateWith: ECRLabsUpdate,
): Promise<void> {
  await extdb()
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
export async function deleteLab(uuid: string): Promise<ECRLabs | undefined> {
  const ecr = await findLabById(uuid);

  if (ecr) {
    await extdb().deleteFrom("ecr_labs").where("uuid", "=", uuid).execute();
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
export async function findEcrConditionById(
  id: string,
): Promise<ECRConditions | undefined> {
  const vals = await extdb()
    .selectFrom("ecr_rr_conditions")
    .where("uuid", "=", id)
    .selectAll()
    .executeTakeFirst();
  return vals as ECRConditions;
}

/**
 * Finds an eCR condition by its criteria
 * @async
 * @function findEcrCondition
 * @param criteria - the Partial<ECRConditions> filter to be looked up
 * @returns an eCR condition object
 */
export async function findEcrCondition(
  criteria: Partial<ECRConditions>,
): Promise<ECRConditions[]> {
  let query = extdb().selectFrom("ecr_rr_conditions");

  for (const criterium of Object.keys(criteria) as (keyof ECRConditions)[]) {
    if (criteria[criterium] !== undefined && criteria[criterium] !== null) {
      query = query.where(criterium, "=", criteria[criterium]!);
    }
  }

  return (await query.selectAll().execute()) as ECRConditions[];
}

/**
 * Creates an eCR condition object
 * @async
 * @function createEcrCondition
 * @param condition - the NewECRConditions to be persisted
 * @returns the created eCR condition object
 */
export async function createEcrCondition(
  condition: NewECRConditions | null,
): Promise<void> {
  if (!condition || condition === null) {
    throw new Error("eICR Data is required.");
  }
  await extdb()
    .insertInto("ecr_rr_conditions")
    .values(condition)
    .executeTakeFirstOrThrow();
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
): Promise<void> {
  await extdb()
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
export async function deleteEcrCondition(
  uuid: string,
): Promise<ECRConditions | undefined> {
  const ecr = await findEcrConditionById(uuid);

  if (ecr) {
    await extdb()
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
 * @param id - the UUID of the record being looked up
 * @returns an eCR rule object
 */
export async function findEcrRuleById(
  id: string,
): Promise<ECRRuleSummaries | undefined> {
  const vals = await extdb()
    .selectFrom("ecr_rr_rule_summaries")
    .where("uuid", "=", id)
    .selectAll()
    .executeTakeFirst();
  return vals as ECRRuleSummaries;
}

/**
 * Finds an eCR rule summary by its criteria
 * @async
 * @function findEcrRule
 * @param criteria - the Parcial<ECRRuleSummaries> to filter the record being looked up
 * @returns an eCR rule object
 */
export async function findEcrRule(
  criteria: Partial<ECRRuleSummaries>,
): Promise<ECRRuleSummaries[]> {
  let query = extdb().selectFrom("ecr_rr_rule_summaries");

  for (const criterium of Object.keys(criteria) as (keyof ECRRuleSummaries)[]) {
    if (criteria[criterium] !== undefined && criteria[criterium] !== null) {
      query = query.where(criterium, "=", criteria[criterium]!);
    }
  }

  return (await query.selectAll().execute()) as ECRRuleSummaries[];
}

/**
 * Creates an eCR rule summary object
 * @async
 * @function createEcrRule
 * @param rule_summary - the NewECRRuleSummaries to be persisted
 * @returns the created eCR rule object
 */
export async function createEcrRule(
  rule_summary: NewECRRuleSummaries,
): Promise<void> {
  if (!rule_summary || rule_summary === null) {
    throw new Error("eICR Data is required.");
  }
  await extdb()
    .insertInto("ecr_rr_rule_summaries")
    .values(rule_summary)
    .execute();
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
): Promise<void> {
  await extdb()
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
export async function deleteEcrRule(
  uuid: string,
): Promise<ECRRuleSummaries | undefined> {
  const rule_summary = await findEcrRuleById(uuid);

  if (rule_summary) {
    await extdb()
      .deleteFrom("ecr_rr_rule_summaries")
      .where("uuid", "=", uuid)
      .execute();
  }

  return rule_summary;
}
