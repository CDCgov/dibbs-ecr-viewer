/**
 * @jest-environment node
 */

import { getAllConditions } from "@/app/data/conditions";

const MOCK_CONDITIONS = [
  { condition: "condition1" },
  { condition: "condition2" },
];

describe("Conditions service", () => {
  it("Should throw an error if the database type is undefined", async () => {
    process.env.METADATA_DATABASE_TYPE = undefined;
    expect(getAllConditions()).toThrow("Database type is undefined.");
  });

  it("Should retrieve all unique conditions", async () => {
    // kysely.conditions.add({ condition: "condition1" }, { condition: "condition2" }); pseudo
    const conditions = await getAllConditions();

    expect(conditions).toEqual(["condition1", "condition2"]);
  });
});
