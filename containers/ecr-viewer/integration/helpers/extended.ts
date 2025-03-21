import { getDb } from "@/app/api/services/database";
import { NewExtendedECR, Extended } from "@/app/api/services/types/extended";

/**
 * Creates an eICR object
 * @param ecr - the NewExtendedECR to be persisted
 * @returns the created eICR object
 */
export async function createExtendedEcr(ecr: NewExtendedECR): Promise<void> {
  await getDb<Extended>().insertInto("ecr_data").values(ecr).execute();
}
