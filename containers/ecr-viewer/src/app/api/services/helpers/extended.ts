import { Kysely } from "kysely";

import { getDb } from "@/app/api/services/database";
import {
  NewExtendedECR,
  NewPatientAddress,
  NewECRLabs,
  Extended,
} from "@/app/api/services/types/extended";

const extdb = () => getDb() as Kysely<Extended>;

/**
 * Creates an eICR object
 * @param ecr - the NewExtendedECR to be persisted
 * @returns the created eICR object
 */
export async function createExtendedEcr(ecr: NewExtendedECR): Promise<void> {
  await extdb().insertInto("ecr_data").values(ecr).execute();
}

/**
 * Creates a patient_address object
 * @param patient_address - the NewPatientAddress to be persisted
 * @returns the created patient_address object
 */
export async function createAddress(
  patient_address: NewPatientAddress,
): Promise<void> {
  await extdb().insertInto("patient_address").values(patient_address).execute();
}

/**
 * Creates an eCR Lab object
 * @param lab - the NewECRLabs to be persisted
 * @returns the created eCR Lab object
 */
export async function createLab(lab: NewECRLabs): Promise<void> {
  await extdb().insertInto("ecr_labs").values(lab).execute();
}
