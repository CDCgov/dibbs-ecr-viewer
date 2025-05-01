/**
 * @jest-environment node
 */

import { getDb } from "@/app/data/metadataDb/database";
import { Core } from "@/app/data/metadataDb/types/core";
import { listConditionReferences } from "@/app/services/listConditionsService";
import {
  createProgramArea,
  deleteProgramArea,
  listProgramAreas,
  updateProgramArea,
} from "@/app/services/programAreaService";
import { createInitialAdminUser } from "@/app/services/userService";

import { buildCore, dropExisting } from "./helpers/ddl";

beforeAll(async () => {
  await buildCore();
  await createInitialAdminUser("admin@admin.com");
  await getDb<Core>()
    .insertInto("condition_reference")
    .values({
      code: "123",
      concept_name: "condition 1 (disease)",
      condition_name: "condition 1",
      condition_category: "category",
    })
    .execute();
  await getDb<Core>()
    .insertInto("condition_reference")
    .values({
      code: "456",
      concept_name: "condition 2 (disease)",
      condition_name: "condition 2",
      condition_category: "category",
    })
    .execute();
  await getDb<Core>()
    .insertInto("condition_reference")
    .values({
      code: "789",
      concept_name: "condition 3 (disease)",
      condition_name: "condition 3",
      condition_category: "other category",
    })
    .execute();
});

afterAll(async () => {
  await dropExisting();
});

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

jest.mock("../src/app/utils/auth-utils", () => ({
  getLoggedInUserSession: jest
    .fn()
    .mockResolvedValue({ name: "Adam Admin", email: "admin@admin.com" }),
}));

describe("program area service", () => {
  it("should create a program area", async () => {
    const progName = "Fun Times";
    const conditionCodes = ["123", "456"];
    const id = await createProgramArea(progName, conditionCodes);
    expect(id).toMatch(UUID_REGEX);

    // see program area listed
    const programAreas = await listProgramAreas();
    expect(programAreas).toBeArrayOfSize(1);
    expect(programAreas).toStrictEqual([
      {
        uuid: id,
        name: progName,
        author_uuid: expect.any(String),
        date_created: expect.any(Date),
      },
    ]);

    const conditions = await listConditionReferences();
    expect(conditions).toBeArrayOfSize(3);
    for (const code of conditionCodes) {
      expect(conditions.find((c) => c.code === code)).toHaveProperty(
        "program_area_uuid",
        id,
      );
    }
    expect(
      conditions.filter((c) => c.program_area_uuid === null),
    ).toBeArrayOfSize(1);
  });

  it("should update a program area name", async () => {
    const progName = "Sad Times";
    const id = await createProgramArea(progName, []);

    const beforeNameConds = await listConditionReferences();
    await updateProgramArea(id, { name: "Happy Days" });
    const afterNameConds = await listConditionReferences();
    const afterNameProgramAreas = await listProgramAreas();
    expect(beforeNameConds).toStrictEqual(afterNameConds);
    const progArea = afterNameProgramAreas.find((p) => p.uuid === id);
    expect(progArea).toHaveProperty("name", "Happy Days");
  });

  it("should update a program area conditions", async () => {
    const progName = "Sad Times";
    const id = await createProgramArea(progName, []);

    const beforeConds = await listConditionReferences();
    const beforeCondProgramAreas = await listProgramAreas();
    await updateProgramArea(id, { conditions: ["789"] });
    const afterConds = await listConditionReferences();
    const afterCondProgramAreas = await listProgramAreas();
    expect(beforeCondProgramAreas).toStrictEqual(afterCondProgramAreas);
    expect(beforeConds).not.toStrictEqual(afterConds);
    const cond = afterConds.filter((c) => c.program_area_uuid === id);
    expect(cond).toBeArrayOfSize(1);
    expect(cond[0]).toHaveProperty("code", "789");
  });

  it("should delete a program area", async () => {
    const beforeCreate = await listProgramAreas();
    const id = await createProgramArea("test", []);
    const afterCreate = await listProgramAreas();

    await deleteProgramArea(id);

    const afterDelete = await listProgramAreas();

    expect(beforeCreate).toStrictEqual(afterDelete);
    expect(afterDelete).toBeArrayOfSize(3);
    expect(afterCreate).toBeArrayOfSize(4);
  });
});
