/**
 * @jest-environment node
 */

import { NO_CONDITIONS_REPORTED_OPTION } from "@/app/constants";
import { getDb } from "@/app/data/metadataDb/database";
import { Core } from "@/app/data/metadataDb/types/core";
import {
  getAllConditions,
  listAdminConditionReferences,
  listAdminConditionReferencesQuery,
} from "@/app/services/listConditionsService";
import { getLoggedInUserSession } from "@/app/utils/auth-utils";

import { createCoreEcr, createEcrCondition } from "./helpers/core";
import { buildCore, dropExisting } from "./helpers/ddl";
import { getSeededUser, seedUserProgramData } from "./helpers/seed";

jest.mock("@/app/utils/auth-utils");

beforeAll(async () => {
  (getLoggedInUserSession as jest.Mock).mockResolvedValue({
    name: "Adam Admin",
    email: "admin@admin.com",
  });

  await buildCore();
  await seedUserProgramData();

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
    condition_code: "123",
  });
  await createEcrCondition({
    eicr_id: "54321",
    uuid: "54321",
    condition: "condition2",
    condition_code: "456",
  });
  await createEcrCondition({
    eicr_id: "12345",
    uuid: "77777",
    condition: "condition3",
    condition_code: "777",
  });
});

afterAll(async () => {
  await dropExisting();
});

describe.each([
  {
    scenario: "without eCRs that have no conditions",
    setupNoConditionsEcr: false,
    expectedAdmin: ["condition1", "condition2", "condition3"],
    expectedStandard: ["condition1"],
    expectedProgramAdmin: ["condition1"],
    expectedNoUser: [],
  },
  {
    scenario: "with eCRs that have no conditions",
    setupNoConditionsEcr: true,
    expectedAdmin: [
      NO_CONDITIONS_REPORTED_OPTION,
      "condition1",
      "condition2",
      "condition3",
    ],
    expectedStandard: ["condition1"],
    expectedProgramAdmin: ["condition1"],
    expectedNoUser: [],
  },
])(
  "Conditions service $scenario",
  ({
    // eslint-disable-next-line unused-imports/no-unused-vars
    scenario,
    setupNoConditionsEcr,
    expectedAdmin,
    expectedStandard,
    expectedProgramAdmin,
    expectedNoUser,
  }) => {
    beforeAll(async () => {
      if (setupNoConditionsEcr) {
        await createCoreEcr({
          eicr_id: "00000",
          set_id: "00000",
          first_name: "first",
          last_name: "last",
          birth_date: "1970-01-01",
        });
      }
    });

    it("Should retrieve all unique conditions for admins", async () => {
      (getLoggedInUserSession as jest.Mock).mockResolvedValue({
        email: "admin@admin.com",
      });

      const conditions = await getAllConditions();
      expect(conditions).toStrictEqual(expectedAdmin);
    });

    it("Should retrieve only unique conditions with authz for standard users", async () => {
      (getLoggedInUserSession as jest.Mock).mockResolvedValue({
        email: "standard@standard.com",
      });

      const conditions = await getAllConditions();
      expect(conditions).toStrictEqual(expectedStandard);
    });

    it("Should retrieve only unique conditions with authz for program admins", async () => {
      (getLoggedInUserSession as jest.Mock).mockResolvedValue({
        email: "programadmin@programadmin.com",
      });

      const conditions = await getAllConditions();
      expect(conditions).toStrictEqual(expectedProgramAdmin);
    });

    it("Should retrieve no conditions if no user", async () => {
      (getLoggedInUserSession as jest.Mock).mockResolvedValue(undefined);

      const conditions = await getAllConditions();
      expect(conditions).toStrictEqual(expectedNoUser);
    });
  },
);

describe("listAdminConditionReferences", () => {
  it("returns all condition references for admins", async () => {
    (getLoggedInUserSession as jest.Mock).mockResolvedValue({
      email: "admin@admin.com",
    });

    const conditions = await listAdminConditionReferences();

    expect(conditions.map(({ code }) => code)).toStrictEqual(["123", "456"]);
  });

  it("returns only condition references in a program admin's program areas", async () => {
    (getLoggedInUserSession as jest.Mock).mockResolvedValue({
      email: "programadmin@programadmin.com",
    });

    const conditions = await listAdminConditionReferences();

    expect(conditions.map(({ code }) => code)).toStrictEqual(["123"]);
  });

  it("rejects standard users", async () => {
    (getLoggedInUserSession as jest.Mock).mockResolvedValue({
      email: "standard@standard.com",
    });

    await expect(listAdminConditionReferences()).rejects.toThrow(
      "Standard user cannot list condition references",
    );
  });
});

describe("listAdminConditionReferencesQuery", () => {
  it("returns all references for an admin and filters by requested codes", async () => {
    const admin = await getSeededUser("admin@admin.com");
    const db = getDb<Core>();

    const allConditions = await listAdminConditionReferencesQuery(admin, db);
    const filteredConditions = await listAdminConditionReferencesQuery(
      admin,
      db,
      ["456"],
    );

    expect(allConditions.map(({ code }) => code)).toStrictEqual(["123", "456"]);
    expect(filteredConditions.map(({ code }) => code)).toStrictEqual(["456"]);
  });

  it("returns only references accessible to a program admin", async () => {
    const programAdmin = await getSeededUser("programadmin@programadmin.com");

    const conditions = await listAdminConditionReferencesQuery(
      programAdmin,
      getDb<Core>(),
    );

    expect(conditions.map(({ code }) => code)).toStrictEqual(["123"]);
  });
});
