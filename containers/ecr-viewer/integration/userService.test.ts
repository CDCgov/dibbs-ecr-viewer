/**
 * @jest-environment node
 */

import { notFound } from "next/navigation";

import { saveFhirMetadata } from "@/app/api/save-fhir-data/service";
import { BundleMetadata } from "@/app/api/save-fhir-data/types";
import { BlobResponse } from "@/app/data/blobStorage/utils";
import { getDb } from "@/app/data/metadataDb/database";
import { Core } from "@/app/data/metadataDb/types/core";
import { createProgramArea } from "@/app/services/programAreaService";
import {
  createInitialAdminUser,
  createUser,
  deleteUser,
  getCheckAdmin,
  isLoggedInUserEcrAuthed,
  isUserEcrAuthed,
  listUserProgramAreas,
  listUsers,
  notFoundUnlessAdmin,
  updateUser,
  updateUserProgramAreas,
} from "@/app/services/userService";
import { getLoggedInUserSession } from "@/app/utils/auth-utils";

import { buildCore, dropExisting } from "./helpers/ddl";

export const makePromiseResolveWithStatus = (
  status: number,
): Promise<BlobResponse> =>
  new Promise((resolve) => resolve({ message: "hi there", status }));

const adminEmail = "admin@admin.com";
const adminName = "Adam Admin";
const userEmail = "standard@user.com";

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

const ecrId = "1-2-3-4";
const baseCoreMetadata: BundleMetadata = {
  last_name: "lname",
  first_name: "fname",
  birth_date: "2000-01-01",
  set_id: "1234",
  eicr_version_number: "1",
  rr: [
    {
      condition: "condition 1",
      condition_code: "123",
      rule_summaries: [],
    },
  ],
  encounter_start_date: "12/20/2024",
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

jest.mock("../src/app/utils/auth-utils");

beforeAll(async () => {
  await buildCore();
  await getDb<Core>()
    .insertInto("condition_reference")
    .values(cond123)
    .execute();
  await getDb<Core>()
    .insertInto("condition_reference")
    .values(cond456)
    .execute();
  await saveFhirMetadata(
    ecrId,
    "core",
    baseCoreMetadata,
    makePromiseResolveWithStatus(200),
    () => makePromiseResolveWithStatus(200),
  );
});

beforeEach(() => {
  (getLoggedInUserSession as jest.Mock).mockResolvedValue({
    name: "Adam Admin",
    email: "admin@admin.com",
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

afterAll(async () => {
  await dropExisting();
});

describe("user service", () => {
  let adminId;
  let userId;
  it("should create initial admin user", async () => {
    let warning: string[] = [];
    jest.spyOn(console, "warn").mockImplementation((...args) => {
      warning = args;
    });
    adminId = await createInitialAdminUser(adminEmail);
    expect(adminId).toMatch(UUID_REGEX);

    // see admin listed
    const users = await listUsers();
    expect(users).toBeArrayOfSize(1);
    expect(users).toStrictEqual([
      {
        uuid: adminId,
        email: adminEmail,
        name: adminName,
        date_of_last_login: expect.any(Date),
        user_type: "admin",
        status: "active",
        author_uuid: adminId,
        date_created: expect.any(Date),
        program_areas: [],
      },
    ]);

    // adding again with same email should do nothing
    const notId = await createInitialAdminUser(adminEmail);
    expect(notId).toBeUndefined();
    expect(warning[0]).toContain("Active admin user already exists");
    warning = [];

    // adding with different email should do nothing
    const alsoNotId = await createInitialAdminUser("other@admin.com");
    expect(alsoNotId).toBeUndefined();
    expect(warning[0]).toContain("Active admin user already exists");

    // admin deletes themself
    await deleteUser(adminId!);

    // Current user isn't an admin any more!
    await expect(listUsers()).rejects.toThrow();

    //admin re-adds themself, gets same id
    const newId = await createInitialAdminUser(adminEmail);
    expect(newId).toBe(adminId);

    // see admin listed
    const afterUsers = await listUsers();
    expect(afterUsers).toBeArrayOfSize(1);
    expect(afterUsers).toStrictEqual([
      {
        uuid: adminId,
        email: adminEmail,
        name: adminName,
        date_of_last_login: expect.any(Date),
        user_type: "admin",
        status: "active",
        author_uuid: adminId,
        date_created: expect.any(Date),
        program_areas: [],
      },
    ]);
  });

  it("admin should be authed to see ecr", async () => {
    const res = await isLoggedInUserEcrAuthed(ecrId);
    expect(res).toBeTrue();
  });

  it("should create a standard user", async () => {
    // admin created in prior test
    userId = await createUser(userEmail, "standard");
    expect(userId).toMatch(UUID_REGEX);

    // see standard user listed
    const users = await listUsers();
    expect(users).toBeArrayOfSize(2);
    expect(users).toStrictEqual([
      {
        uuid: expect.any(String),
        email: adminEmail,
        name: adminName,
        date_of_last_login: expect.any(Date),
        user_type: "admin",
        status: "active",
        author_uuid: adminId!,
        date_created: expect.any(Date),
        program_areas: [],
      },
      {
        uuid: userId,
        email: userEmail,
        name: null,
        date_of_last_login: null,
        user_type: "standard",
        status: "active",
        author_uuid: adminId!,
        date_created: expect.any(Date),
        program_areas: [],
      },
    ]);
  });

  it("user should not yet be authed to see ecr", async () => {
    const res = await isUserEcrAuthed(userId!, ecrId);
    expect(res).toBeFalse();
  });

  it("should update a user", async () => {
    // standard user created in prior test
    await updateUser(userId!, { name: "Olga Nunes" });

    // see standard user listed with name
    const users = await listUsers();
    expect(users).toBeArrayOfSize(2);
    expect(users).toStrictEqual([
      {
        uuid: adminId!,
        email: adminEmail,
        name: adminName,
        date_of_last_login: expect.any(Date),
        user_type: "admin",
        status: "active",
        author_uuid: adminId!,
        date_created: expect.any(Date),
        program_areas: [],
      },
      {
        uuid: userId!,
        email: userEmail,
        name: "Olga Nunes",
        date_of_last_login: null,
        user_type: "standard",
        status: "active",
        author_uuid: adminId!,
        date_created: expect.any(Date),
        program_areas: [],
      },
    ]);
  });

  it("should update a user's program areas", async () => {
    // standard user created in prior test
    await updateUser(userId!, { name: "Olga Nunes" });
    const progId = await createProgramArea("Disease", ["123"]);

    await updateUserProgramAreas(userId!, [progId]);

    const progAreas = await listUserProgramAreas(userId!);

    expect(progAreas).toStrictEqual([
      {
        uuid: progId,
        author_uuid: adminId!,
        name: "Disease",
        date_created: expect.any(Date),
      },
    ]);
  });

  it("user should now be authed to see ecr", async () => {
    const res = await isUserEcrAuthed(userId!, ecrId);
    expect(res).toBeTrue();
  });

  it("should delete a user", async () => {
    // standard user created in prior test
    await deleteUser(userId!);

    // see only admin user listed
    const users = await listUsers();
    expect(users).toBeArrayOfSize(1);
    expect(users).toStrictEqual([
      {
        uuid: adminId!,
        email: adminEmail,
        name: adminName,
        date_of_last_login: expect.any(Date),
        user_type: "admin",
        status: "active",
        author_uuid: adminId!,
        date_created: expect.any(Date),
        program_areas: [],
      },
    ]);

    // should also delete program area assignments
    const progAreas = await listUserProgramAreas(userId!);
    expect(progAreas).toStrictEqual([]);
  });

  describe("getCheckAdmin", () => {
    it("should return admin if user is an admin", async () => {
      const admin = await getCheckAdmin("do a thing");
      expect(admin.email).toBe(adminEmail);
    });

    it("should error if user is not an admin", async () => {
      (getLoggedInUserSession as jest.Mock).mockResolvedValue({
        name: "Sally Standard",
        email: "standard@user.com",
      });
      await expect(getCheckAdmin("do a thing")).rejects.toThrow();
    });
  });

  describe("notFoundUnessAdmin", () => {
    it("should do nothing if user is an admin", async () => {
      await notFoundUnlessAdmin();
      expect(notFound).not.toHaveBeenCalled();
    });

    it("should notFound if user is not an admin", async () => {
      (getLoggedInUserSession as jest.Mock).mockResolvedValue({
        name: "Sally Standard",
        email: "standard@user.com",
      });
      await notFoundUnlessAdmin();
      expect(notFound).toHaveBeenCalled();
    });
  });
});
