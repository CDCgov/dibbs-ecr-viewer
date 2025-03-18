/**
 * @jest-environment node
 */

import { buildCore, dropCore } from "@/app/api/services/db_schema";
import { createEcrCondition } from "@/app/api/services/extended_database_repo";
import { getAllConditions } from "@/app/data/conditions";

describe("Conditions service", () => {
  beforeAll(async () => {
    await buildCore();
    await createEcrCondition({
      eICR_ID: "12345",
      uuid: "12345",
      condition: "condition1",
    });
    await createEcrCondition({
      eICR_ID: "54321",
      uuid: "54321",
      condition: "condition2",
    });
  });

  afterAll(async () => {
    await dropCore();
  });

  it("Should retrieve all unique conditions", async () => {
    const conditions = await getAllConditions();
    expect(conditions).toStrictEqual(["condition1", "condition2"]);
  });
});
