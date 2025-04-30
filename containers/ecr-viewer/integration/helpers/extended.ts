import { getDb } from "@/app/data/metadataDb/database";
import { NewExtendedECR, Extended } from "@/app/data/metadataDb/types/extended";

/**
 * Creates an eICR object
 * @param ecr - the NewExtendedECR to be persisted
 * @returns promise
 */
export async function createExtendedEcr(ecr: NewExtendedECR): Promise<void> {
  await getDb<Extended>().insertInto("ecr_data").values(ecr).execute();
}
