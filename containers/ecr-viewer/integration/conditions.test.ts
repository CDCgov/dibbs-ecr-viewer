/**
 * @jest-environment node
 */

import { getAllConditions } from "@/app/data/conditions";

import { createEcrCondition } from "./helpers/core";
import { buildCore, dropExisting } from "./helpers/ddl";

beforeAll(async () => {
  await buildCore();
});

afterAll(async () => {
  await dropExisting();
});

describe("Conditions service", () => {
  it("Should retrieve all unique conditions", async () => {
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

    const conditions = await getAllConditions();
    expect(conditions).toStrictEqual(["condition1", "condition2"]);
  });
});
