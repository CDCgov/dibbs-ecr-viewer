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
import {
  createInitialAdminUser,
  listUserProgramAreas,
  updateUser,
} from "@/app/services/userService";

import { buildCore, dropExisting } from "./helpers/ddl";

const cond123 = {
  code: "123",
  concept_name: "condition 1 (disease)",
  condition_name: "condition 1",
  condition_category: "category",
};
const cond456 = {
  code: "456",
  concept_name: "condition 2 (disease)",
  condition_name: "condition 2",
  condition_category: "category",
};
const cond789 = {
  code: "789",
  concept_name: "condition 3 (disease)",
  condition_name: "condition 3",
  condition_category: "other category",
};

let adminId;
beforeAll(async () => {
  await buildCore();
  adminId = await createInitialAdminUser("admin@admin.com");
  for (const cond of [cond123, cond456, cond789]) {
    await getDb<Core>()
      .insertInto("condition_reference")
      .values(cond)
      .execute();
  }
});

afterAll(async () => {
  await dropExisting();
});

afterEach(() => {
  jest.clearAllMocks();
});

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

jest.mock("@/app/utils/auth-utils", () => ({
  getLoggedInUserSession: jest
    .fn()
    .mockResolvedValue({ name: "Adam Admin", email: "admin@admin.com" }),
}));

describe("program area service", () => {
  let progId;
  it("should create a program area", async () => {
    const progName = "Fun Times";
    const conditionCodes = ["123", "456"];
    progId = await createProgramArea({
      name: progName,
      conditions: conditionCodes,
    });
    expect(progId).toMatch(UUID_REGEX);

    // see program area listed
    const programAreas = await listProgramAreas();
    expect(programAreas).toBeArrayOfSize(1);
    expect(programAreas).toStrictEqual([
      {
        uuid: progId,
        name: progName,
        author_uuid: expect.any(String),
        date_created: expect.any(Date),
        conditions: [
          { ...cond123, program_area_uuid: progId, is_duplicate: false },
          { ...cond456, program_area_uuid: progId, is_duplicate: false },
        ],
      },
    ]);

    const conditions = await listConditionReferences();
    expect(conditions).toBeArrayOfSize(3);
    for (const code of conditionCodes) {
      expect(conditions.find((c) => c.code === code)).toHaveProperty(
        "program_area_uuid",
        progId,
      );
    }
    expect(
      conditions.filter((c) => c.program_area_uuid === null),
    ).toBeArrayOfSize(1);

    // program with name already exists
    jest.spyOn(console, "error").mockImplementation();
    await expect(
      createProgramArea({ name: progName, conditions: [] }),
    ).rejects.toThrow();
  });

  it("should update a program area name", async () => {
    const progName = "Sad Times";
    const id = await createProgramArea({ name: progName, conditions: ["123"] });

    const beforeNameConds = await listConditionReferences();
    await updateProgramArea({ uuid: id, name: "Happy Days" });
    const afterNameConds = await listConditionReferences();
    const afterNameProgramAreas = await listProgramAreas();
    expect(
      // eslint-disable-next-line unused-imports/no-unused-vars
      beforeNameConds.map(({ program_area_name, ...cond }) => cond),
    ).toStrictEqual(
      // eslint-disable-next-line unused-imports/no-unused-vars
      afterNameConds.map(({ program_area_name, ...cond }) => cond),
    );
    const progArea = afterNameProgramAreas.find((p) => p.uuid === id);
    expect(progArea).toHaveProperty("name", "Happy Days");

    // program with name already exists
    jest.spyOn(console, "error").mockImplementation();
    await expect(
      updateProgramArea({ uuid: id, name: "Fun Times" }),
    ).rejects.toThrow();
  });

  it("should update a program area conditions", async () => {
    const progName = "Sad Times";
    const id = await createProgramArea({ name: progName, conditions: ["123"] });

    const beforeConds = await listConditionReferences();
    const beforeCond = beforeConds.filter((c) => c.program_area_uuid === id);
    expect(beforeCond).toBeArrayOfSize(1);
    expect(beforeCond[0]).toHaveProperty("code", "123");
    await updateProgramArea({ uuid: id, conditions: ["789"] });
    const afterConds = await listConditionReferences();
    expect(beforeConds).not.toStrictEqual(afterConds);
    const cond = afterConds.filter((c) => c.program_area_uuid === id);
    expect(cond).toBeArrayOfSize(1);
    expect(cond[0]).toHaveProperty("code", "789");
  });

  it("should delete a program area", async () => {
    const beforeCreate = await listProgramAreas();
    const id = await createProgramArea({ name: "test", conditions: ["123"] });
    const afterCreate = await listProgramAreas();

    await updateUser({ uuid: adminId!, updates: {}, programs: [id, progId!] });
    const beforeUserProgramAreas = await listUserProgramAreas(adminId!);
    expect(beforeUserProgramAreas).toBeArrayOfSize(2);

    await deleteProgramArea({ uuid: id });

    const afterDelete = await listProgramAreas();

    expect(beforeCreate.map(({ uuid }) => uuid)).toStrictEqual(
      afterDelete.map(({ uuid }) => uuid),
    );
    expect(afterDelete).toBeArrayOfSize(3);
    expect(afterCreate).toBeArrayOfSize(4);

    const afterUserProgramAreas = await listUserProgramAreas(adminId!);
    expect(afterUserProgramAreas).toBeArrayOfSize(1);
    expect(
      afterUserProgramAreas.filter((p) => p.uuid === progId!),
    ).toBeArrayOfSize(1);
  });
});
