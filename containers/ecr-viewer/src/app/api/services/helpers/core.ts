import { Kysely } from "kysely";

import { getDb } from "@/app/api/services/database";
import { NewCoreECR, Core } from "@/app/api/services/types/core";

const coredb = () => getDb() as Kysely<Core>;

/**
 * Creates an eICR object
 * @param ecr - the NewECR to be persisted
 * @returns the created eICR object
 */
export async function createCoreEcr(ecr: NewCoreECR): Promise<void> {
  await coredb().insertInto("ecr_data").values(ecr).execute();
}
