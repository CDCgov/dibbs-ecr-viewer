/**
 * @jest-environment node
 */

import { getAllConditions } from "@/app/data/conditions";

import { createEcrCondition } from "./helpers/common";
import { buildCore, dropExisting } from "./helpers/ddl";

describe("Conditions service", () => {
  beforeAll(async () => {
    await buildCore();
    await createEcrCondition({
      eicr_id: "12345",
      uuid: "12345",
      condition: "condition1",
    });
    await createEcrCondition({
      eicr_id: "54321",
      uuid: "54321",
      condition: "condition2",
    });
  });

  afterAll(async () => {
    await dropExisting();
  });

  it("Should retrieve all unique conditions", async () => {
    const conditions = await getAllConditions();
    expect(conditions).toStrictEqual(["condition1", "condition2"]);
  });
});
