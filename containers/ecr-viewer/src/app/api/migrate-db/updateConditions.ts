import { getDb } from "@/app/data/metadataDb/database";
import { Core } from "@/app/data/metadataDb/types/core";

interface OrchestrationConditions {
  condition_category: string;
  condition_name: string;
  concept_name: string;
  code: string;
}

/**
 * Make a request to orchestration /process-zip endpoint
 * @returns orchestration response
 */
const getOrchestrationResponse = async (): Promise<
  OrchestrationConditions[]
> => {
  const response = await fetch(`${process.env.ORCHESTRATION_URL}/conditions`);

  if (response.status !== 200) {
    console.error(await response.text());
    throw "Error thrown from orchestration while fetching conditions";
  } else {
    const resp = await response.json();
    return resp.conditions;
  }
};

const upsertConditions = async (conditions: OrchestrationConditions[]) => {
  await getDb<Core>()
    .transaction()
    .execute(async (db) => {
      for (const condition of conditions) {
        await db
          .insertInto("condition_reference")
          .columns([
            "code",
            "concept_name",
            "condition_name",
            "condition_category",
          ])
          .values(condition)
          .onConflict((cb) => cb.column("code").doUpdateSet(condition))
          .execute();
      }
    });
};

/**
 * Update the conditions reference table in the db
 * @returns promise
 */
export const updateConditions = async (): Promise<void> => {
  try {
    const conditions = await getOrchestrationResponse();
    await upsertConditions(conditions);
  } catch (error: unknown) {
    const message = "Failed to process orchestration response";
    console.error({ message, error });
    throw new Error(message);
  }
};
