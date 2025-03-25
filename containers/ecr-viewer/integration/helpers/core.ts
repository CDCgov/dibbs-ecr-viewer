import { getDb } from "@/app/api/services/database";
import { NewCoreECR, Core } from "@/app/api/services/types/core";

/**
 * Creates an eICR object
 * @param ecr - the NewECR to be persisted
 * @returns promise
 */
export async function createCoreEcr(ecr: NewCoreECR): Promise<void> {
  await getDb<Core>().insertInto("ecr_data").values(ecr).execute();
}
