/**
 * @jest-environment node
 */

import { getDb } from "@/app/data/metadataDb/database";
import { Core } from "@/app/data/metadataDb/types/core";
import { getAllConditions } from "@/app/services/listConditionsService";
import { createProgramArea } from "@/app/services/programAreaService";
import {
  createInitialAdminUser,
  createUser,
  updateUserProgramAreas,
} from "@/app/services/userService";
import { getLoggedInUserSession } from "@/app/utils/auth-utils";

import { createCoreEcr, createEcrCondition } from "./helpers/core";
import { buildCore, dropExisting } from "./helpers/ddl";

// jest.mock("../src/app/services/userService")
jest.mock("../src/app/utils/auth-utils");

let userId;
let adminId;

beforeAll(async () => {
  (getLoggedInUserSession as jest.Mock).mockResolvedValue({
    name: "Adam Admin",
    email: "admin@admin.com",
  });

  await buildCore();
  await getDb<Core>()
    .insertInto("condition_reference")
    .values({
      code: "12345",
      concept_name: "condition 1 (disease)",
      condition_name: "condition 1",
      condition_category: "category",
    })
    .execute();
  await getDb<Core>()
    .insertInto("condition_reference")
    .values({
      code: "54321",
      concept_name: "condition 2 (disease)",
      condition_name: "condition 2",
      condition_category: "category",
    })
    .execute();

  await createCoreEcr({
    eicr_id: "12345",
    set_id: "12345",
    first_name: "first",
    last_name: "last",
    birth_date: "1970-01-01",
  });
  await createCoreEcr({
    eicr_id: "54321",
    set_id: "54321",
    first_name: "first",
    last_name: "last",
    birth_date: "1970-01-01",
  });
  await createEcrCondition({
    eicr_id: "12345",
    uuid: "12345",
    condition: "condition1",
    condition_code: "12345",
  });
  await createEcrCondition({
    eicr_id: "54321",
    uuid: "54321",
    condition: "condition2",
    condition_code: "54321",
  });
  await createEcrCondition({
    eicr_id: "12345",
    uuid: "77777",
    condition: "condition3",
    condition_code: "77777",
  });
  adminId = await createInitialAdminUser("admin@admin.com");
  const progId = await createProgramArea("test", ["12345"]);
  userId = await createUser("test@test.com", "standard");
  await updateUserProgramAreas(userId, [progId]);
});

afterAll(async () => {
  await dropExisting();
});

describe("Conditions service", () => {
  it("Should retrieve all unique conditions for admins", async () => {
    (getLoggedInUserSession as jest.Mock).mockResolvedValue({
      email: "admin@admin.com",
    });

    const conditions = await getAllConditions();
    expect(conditions).toStrictEqual([
      "condition1",
      "condition2",
      "condition3",
    ]);
  });

  it("Should retrieve only unique conditions with authz for standard users", async () => {
    (getLoggedInUserSession as jest.Mock).mockResolvedValue({
      email: "test@test.com",
    });

    const conditions = await getAllConditions();
    expect(conditions).toStrictEqual(["condition1"]);
  });

  it("Should retrieve no conditions if no user", async () => {
    (getLoggedInUserSession as jest.Mock).mockResolvedValue(undefined);

    const conditions = await getAllConditions();
    expect(conditions).toStrictEqual([]);
  });
});
