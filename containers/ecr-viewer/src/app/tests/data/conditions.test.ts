/**
 * @jest-environment node
 */

import { getAllConditions } from "@/app/data/conditions";
import { db } from "@/app/api/services/database";
import { createEcrCondition } from "@/app/api/services/extended_database_repo";

describe("Conditions service", () => {
  beforeAll(async () => {
    await db.schema
      .createTable("ecr_rr_conditions")
      .addColumn("uuid", "varchar(200)", (cb) => cb.primaryKey())
      .addColumn("eICR_ID", "varchar(255)", (cb) => cb.notNull())
      .addColumn("condition", "varchar")
      .execute();
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
    await db.schema.dropTable("ecr_rr_conditions").execute();
  });

  it("Should throw an error if the database type is undefined", async () => {
    delete process.env.METADATA_DATABASE_TYPE;
    
    await expect(getAllConditions()).rejects.toThrow(
      "Database type is undefined.",
    );
  });

  it("Should retrieve all unique conditions", async () => {
    process.env.METADATA_DATABASE_TYPE = "postgres";
    const conditions = await getAllConditions();
    expect(conditions).toEqual(["condition1", "condition2"]);
  });
});
