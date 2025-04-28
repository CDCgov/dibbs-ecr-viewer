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
  const db = getDb<Core>();
  const currentConditions = await db
    .selectFrom("condition_reference")
    .select("code")
    .execute();
  const conditionSet = new Set(currentConditions.map(({ code }) => code));
  await getDb<Core>()
    .transaction()
    .execute(async (db) => {
      for (const condition of conditions) {
        const { concept_name, condition_name, code, condition_category } =
          condition;
        if (conditionSet.has(code)) {
          await db
            .updateTable("condition_reference")
            .set({
              condition_name,
              concept_name,
              condition_category,
            })
            .where("code", "=", code)
            .execute();
        } else {
          await db
            .insertInto("condition_reference")
            .columns([
              "code",
              "concept_name",
              "condition_name",
              "condition_category",
            ])
            .values(condition)
            .execute();
        }
      }
    });
};

/**
 * Update the conditions reference table in the db
 * @returns promise
 */
export const updateConditions = async (): Promise<void> => {
  const conditions = await getOrchestrationResponse();
  try {
    await upsertConditions(conditions);
  } catch (error: unknown) {
    const message = "Failed to process orchestration response";
    console.error({ message, error });
    throw new Error(message);
  }
};
