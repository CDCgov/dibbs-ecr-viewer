import { db } from "./database";
import {
  ExtendedECR,
  PatientAddress,
  NewPatientAddress,
  PatientAddressUpdate,
} from "./extended_types";

/**
 * Finds an eICR by its ID
 * @async
 * @function findEcrById
 * @param id
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
 * Finds an eICR by its criteria
 * @async
 * @function findExtendedEcr
 * @param criteria
 * @returns an eICR object
 */
export async function findExtendedEcr(criteria: Partial<ExtendedECR> | null) {
  let query = db.selectFrom("ecr_data");

  if (!criteria || criteria == null) {
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
 * @param ecr
 * @returns the created eICR object
 */
export async function createExtendedEcr(ecr: NewECR | null) {
  if (!ecr || ecr == null) {
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
 * @param eICR_ID
 * @param updateWith
 * @returns the updated eICR object
 */
export async function updateExtendedEcr(
  eICR_ID: string | null,
  updateWith: ECRUpdate,
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
 * @param eICR_ID
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
 * @param id
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
 * @param criteria
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
 * @param patient_address
 * @function createAddress
 * @param address
 * @returns the created patient_address object
 */
export async function createAddress(patient_address: NewPatientAddress) {
  if (!patient_address || patient_address == null) {
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
 * @param uuid
 * @param updateWith
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
 * @param uuid
 * @returns the deleted patient_address object
 */
export async function deleteAddress(uuid: string) {
  const address = await findAddressById(uuid);

  if (address) {
    await db.deleteFrom("patient_address").where("uuid", "=", uuid).execute();
  }

  return address;
}
