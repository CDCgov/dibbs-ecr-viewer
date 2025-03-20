import { Kysely } from "kysely";

import { getDb } from "@/app/api/services/database";
import { NewCoreECR, Core } from "@/app/api/services/types/core";

const coredb = () => getDb() as Kysely<Core>;

/**
 * Creates an eICR object
 * @async
 * @function createEcr
 * @param ecr - the NewECR to be persisted
 * @returns the created eICR object
 */
export async function createCoreEcr(ecr: NewCoreECR | null): Promise<void> {
  if (!ecr) {
    throw new Error("eICR Data is required.");
  }
  await coredb().insertInto("ecr_data").values(ecr).execute();
}
