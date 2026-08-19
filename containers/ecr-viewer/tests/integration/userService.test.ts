/**
 * @jest-environment node
 */

import { notFound } from "next/navigation";

import {
  BundleMetadata,
  saveFhirMetadata,
} from "@/app/services/saveFhirDataService";
import { BlobResponse } from "@/app/data/blobStorage/utils";
import { getDb } from "@/app/data/metadataDb/database";
import { Core } from "@/app/data/metadataDb/types/core";
import { createProgramArea } from "@/app/services/programAreaService";
import {
  createInitialAdminUser,
  createUser,
  deleteUser,
  getCheckAdmin,
  getCheckAnyAdmin,
  hasRelevantProgramAreaAccess,
  isLoggedInUserEcrAuthed,
  isUserEcrAuthed,
  ListedUser,
  listLoggedInUserProgramAreas,
  listUserProgramAreas,
  listUsers,
  notFoundUnlessAdmin,
  notFoundUnlessAnyAdmin,
  updateUser,
  validateAdminUserPermissions,
} from "@/app/services/userService";
import { getLoggedInUserSession } from "@/app/utils/auth-utils";

import { getLastAuditLog } from "./helpers/core";
import { buildCore, dropExisting } from "./helpers/ddl";
import { UserFacingError } from "@/app/services/errorService";

export const makePromiseResolveWithStatus = (
  status: number,
): Promise<BlobResponse> =>
  new Promise((resolve) => resolve({ message: "hi there", status }));

const adminUserEmail = "admin@admin.com";
const standardUserEmail = "standard@standard.com";
const programAdminEmail = "programadmin@programadmin.com";

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
const condUnauthorized = {
  code: "789",
  concept_name: "condition unauthorized",
  condition_name: "condition unauthorized",
  condition_category: "category",
};
const programArea123 = {
  name: "Program Area 123",
  conditions: ["123"],
};
const programArea456 = {
  name: "Program Area 456",
  conditions: ["456"],
};
const programAreaUnauthorized = {
  name: "Program Area Unauthorized",
  conditions: ["789"],
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
  facility_name: undefined,
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

jest.mock("@/app/utils/auth-utils");

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
  await getDb<Core>()
    .insertInto("condition_reference")
    .values(condUnauthorized)
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

describe("User Service", () => {
  let adminUserId;
  let standardUserId: string;
  let programAdminUserId: string;

  let programArea123Id: string;
  let programArea456Id: string;
  let programAreaUnauthorizedId: string;

  let expectedAdminUser: ListedUser;
  let expectedStandardUser: ListedUser;
  let expectedProgramAdminUser: ListedUser;

  it("should create initial admin user", async () => {
    let warning: string[] = [];
    jest.spyOn(console, "warn").mockImplementation((...args) => {
      warning = args;
    });
    adminUserId = await createInitialAdminUser({
      email: adminUserEmail,
    });
    expect(adminUserId).toMatch(UUID_REGEX);

    expectedAdminUser = {
      uuid: adminUserId!,
      email: adminUserEmail,
      name: null,
      date_of_last_login: null,
      user_type: "admin",
      status: "active",
      author_uuid: adminUserId!,
      date_created: expect.any(Date),
      program_areas: [],
    };

    const createLog = await getLastAuditLog();
    expect(createLog.subject).toEqual("user");
    expect(createLog.action).toEqual("create");
    expect(JSON.parse(createLog.parameter_json)).toStrictEqual({
      email: adminUserEmail,
      uuid: adminUserId,
    });

    // see admin listed
    const users = await listUsers();
    expect(users).toBeArrayOfSize(1);
    expect(users).toStrictEqual([expectedAdminUser]);

    // adding again with same email should do nothing
    const notId = await createInitialAdminUser({ email: adminUserEmail });
    expect(notId).toBeUndefined();
    expect(warning[0]).toContain("Active admin user already exists");
    warning = [];

    // adding with different email should do nothing
    const alsoNotId = await createInitialAdminUser({
      email: "other@admin.com",
    });
    expect(alsoNotId).toBeUndefined();
    expect(warning[0]).toContain("Active admin user already exists");

    // admin deletes themself
    await deleteUser({ uuid: adminUserId! });

    // Current user isn't an admin any more!
    await expect(listUsers()).rejects.toThrow();

    //admin re-adds themself, gets same id
    const newId = await createInitialAdminUser({ email: adminUserEmail });
    expect(newId).toBe(adminUserId);

    // see admin listed
    const afterUsers = await listUsers();
    expect(afterUsers).toBeArrayOfSize(1);
    expect(afterUsers).toStrictEqual([expectedAdminUser]);
  });

  it("isLoggedInUserEcrAuthed: admin should be authed to see ecr", async () => {
    const res = await isLoggedInUserEcrAuthed(ecrId);
    expect(res).toBeTrue();
  });

  describe("createUser", () => {
    it("as an admin, should create a standard user", async () => {
      // admin created in prior test
      // creates standard user no programs
      standardUserId = await createUser({
        email: standardUserEmail,
        userType: "standard",
        programs: [],
      });
      expect(standardUserId).toMatch(UUID_REGEX);

      expectedStandardUser = {
        uuid: standardUserId,
        email: standardUserEmail,
        name: null,
        date_of_last_login: null,
        user_type: "standard",
        status: "active",
        author_uuid: adminUserId!,
        date_created: expect.any(Date),
        program_areas: [],
      };

      // check audit log
      const createLog = await getLastAuditLog();
      expect(createLog.actor).toEqual(adminUserId!);
      expect(createLog.subject).toEqual("user");
      expect(createLog.action).toEqual("create");
      expect(JSON.parse(createLog.parameter_json)).toStrictEqual({
        email: standardUserEmail,
        userType: "standard",
        programs: [],
        uuid: standardUserId,
      });

      // see standard user listed
      const users = await listUsers();
      expect(users).toBeArrayOfSize(2); // admin + standard
      expect(users).toStrictEqual([expectedAdminUser, expectedStandardUser]);
    });

    it("as an admin, should create a program admin user", async () => {
      programArea456Id = await createProgramArea(programArea456);
      expect(programArea456Id).toMatch(UUID_REGEX);

      // Create program admin w/ access to program area 456
      programAdminUserId = await createUser({
        email: programAdminEmail,
        userType: "prog_admin",
        programs: [programArea456Id],
      });
      expect(programAdminUserId).toMatch(UUID_REGEX);
      expectedProgramAdminUser = {
        uuid: programAdminUserId,
        email: programAdminEmail,
        name: null,
        date_of_last_login: null,
        user_type: "prog_admin",
        status: "active",
        author_uuid: adminUserId!,
        date_created: expect.any(Date),
        program_areas: [
          {
            name: "Program Area 456",
            program_area_uuid: programArea456Id,
            user_uuid: programAdminUserId,
          },
        ],
      };

      // Check audit log
      const createLog = await getLastAuditLog();
      expect(createLog.actor).toEqual(adminUserId!);
      expect(createLog.subject).toEqual("user");
      expect(createLog.action).toEqual("create");
      expect(JSON.parse(createLog.parameter_json)).toStrictEqual({
        email: programAdminEmail,
        userType: "prog_admin",
        programs: [programArea456Id],
        uuid: programAdminUserId,
      });

      // Program admin should be listed
      const users = await listUsers();
      expect(users).toContainEqual(expectedProgramAdminUser);
    });

    it("as a program admin, should not create an admin user", async () => {
      // Log in as Program Admin
      (getLoggedInUserSession as jest.Mock).mockResolvedValue({
        name: "Program Admin 1",
        email: programAdminEmail,
      });

      // Program admin should not be able to create admin
      await expect(
        createUser({
          email: "new-admin@admin.com",
          userType: "admin",
          programs: [],
        }),
      ).rejects.toThrow("Program admins cannot create new admins");
    });

    it("as a program admin, should not create a user for an unauthorized program area", async () => {
      // Create program area 456
      programArea123Id = await createProgramArea(programArea123);
      expect(programArea123Id).toMatch(UUID_REGEX);

      // Ensure logged in user is program admin with access to Program Area 123
      (getLoggedInUserSession as jest.Mock).mockResolvedValue({
        name: "Program Admin 1",
        email: programAdminEmail,
      });

      // Program areas of program admin should be listed
      const progAreas = await listLoggedInUserProgramAreas();
      expect(progAreas).toStrictEqual([
        {
          uuid: programArea456Id!,
          author_uuid: adminUserId!,
          name: "Program Area 456",
          date_created: expect.any(Date),
        },
      ]);

      // Attempt to create standard user with access to Program Area 456
      await expect(
        createUser({
          email: "new-user@standard.com",
          userType: "standard",
          programs: [programArea123Id],
        }),
      ).rejects.toThrow(
        "Program admins cannot create users outside of their program areas",
      );
    });
  });

  describe("isUserEcrAuthed: not yet authed to see eCR", () => {
    it("standard user", async () => {
      const res = await isUserEcrAuthed(standardUserId, ecrId);
      expect(res).toBeFalse();
    });

    it("program admin", async () => {
      const res = await isUserEcrAuthed(programAdminUserId, ecrId);
      expect(res).toBeFalse();
    });
  });

  describe("updateUser", () => {
    it("as an admin, should update a user", async () => {
      // standard user created in prior test
      await updateUser({
        uuid: standardUserId!,
        updates: { name: "Olga Nunes" },
        programs: [],
      });

      // check audit log
      const log = await getLastAuditLog();
      expect(log.actor).toEqual(adminUserId!);
      expect(log.subject).toEqual("user");
      expect(log.action).toEqual("update");
      expect(JSON.parse(log.parameter_json)).toStrictEqual({
        updates: { name: "Olga Nunes" },
        programs: [],
        uuid: standardUserId!,
      });

      expectedStandardUser = {
        ...expectedStandardUser,
        name: "Olga Nunes",
      };

      // see standard user listed with name
      const users = await listUsers();
      expect(users).toBeArrayOfSize(3);
      expect(users).toStrictEqual([
        expectedAdminUser,
        expectedProgramAdminUser,
        expectedStandardUser,
      ]);
    });

    it("as an admin, should update a standard user's program areas", async () => {
      // standard user created in prior test
      await updateUser({
        uuid: standardUserId!,
        updates: { name: "Olga Nunes" },
        programs: [programArea123Id!],
      });

      // check audit log
      const log = await getLastAuditLog();
      expect(log.actor).toEqual(adminUserId!);
      expect(log.subject).toEqual("user");
      expect(log.action).toEqual("update");
      expect(JSON.parse(log.parameter_json)).toStrictEqual({
        updates: { name: "Olga Nunes" },
        programs: [programArea123Id!],
        uuid: standardUserId!,
      });

      const progAreas = await listUserProgramAreas(standardUserId!);

      expect(progAreas).toStrictEqual([
        {
          uuid: programArea123Id!,
          author_uuid: adminUserId!,
          name: "Program Area 123",
          date_created: expect.any(Date),
        },
      ]);
    });

    it("as an admin, should update a program admin's program areas", async () => {
      // program user created in prior test
      await updateUser({
        uuid: programAdminUserId!,
        updates: {},
        programs: [programArea123Id!, programArea456Id!], // Add access to Program area 123
      });

      // check audit log
      const log = await getLastAuditLog();
      expect(log.actor).toEqual(adminUserId!);
      expect(log.subject).toEqual("user");
      expect(log.action).toEqual("update");
      expect(JSON.parse(log.parameter_json)).toStrictEqual({
        updates: {},
        programs: [programArea123Id!, programArea456Id!],
        uuid: programAdminUserId!,
      });

      const progAreas = await listUserProgramAreas(programAdminUserId!);

      expect(progAreas).toHaveLength(2);
      expect(progAreas).toEqual(
        expect.arrayContaining([
          {
            uuid: programArea123Id!,
            author_uuid: adminUserId!,
            name: "Program Area 123",
            date_created: expect.any(Date),
          },
          {
            uuid: programArea456Id!,
            author_uuid: adminUserId!,
            name: "Program Area 456",
            date_created: expect.any(Date),
          },
        ]),
      );

      expectedProgramAdminUser = {
        ...expectedProgramAdminUser,
        program_areas: [
          ...expectedProgramAdminUser.program_areas,
          {
            name: "Program Area 123",
            program_area_uuid: programArea123Id,
            user_uuid: programAdminUserId,
          },
        ],
      };
    });
  });

  describe("isUserEcrAuthed: should now be authed to see eCR", () => {
    it("standard user", async () => {
      await updateUser({
        uuid: standardUserId,
        updates: {},
        programs: [programArea123Id],
      });

      const res = await isUserEcrAuthed(standardUserId, ecrId);
      expect(res).toBeTrue();
    });

    it("program admin", async () => {
      await updateUser({
        uuid: programAdminUserId,
        updates: {},
        programs: [programArea123Id, programArea456Id],
      });

      const res = await isUserEcrAuthed(programAdminUserId, ecrId);
      expect(res).toBeTrue();
    });
  });

  describe("deleteUser", () => {
    it("as an admin, should delete a user", async () => {
      const beforeUsers = await listUsers();
      expect(beforeUsers).toBeArrayOfSize(3); // admin + program admin + standard

      // standard user created in prior test
      await deleteUser({ uuid: standardUserId! });

      // check audit log
      const deleteLog = await getLastAuditLog();
      expect(deleteLog.actor).toEqual(adminUserId!);
      expect(deleteLog.subject).toEqual("user");
      expect(deleteLog.action).toEqual("delete");
      expect(JSON.parse(deleteLog.parameter_json)).toStrictEqual({
        uuid: standardUserId!,
      });

      // see only admin + program admin listed
      const users = await listUsers();
      expect(users).toBeArrayOfSize(2); // admin + program admin
      expect(users).toEqual(
        expect.arrayContaining([
          expectedAdminUser,
          expect.objectContaining({
            ...expectedProgramAdminUser,
            program_areas: expect.arrayContaining(
              expectedProgramAdminUser.program_areas,
            ),
          }),
        ]),
      );

      // should also delete standard user program area assignments
      const progAreas = await listUserProgramAreas(standardUserId!);
      expect(progAreas).toStrictEqual([]);
    });
  });

  describe("getCheckAdmin", () => {
    it("should return admin if user is an admin", async () => {
      const admin = await getCheckAdmin("do a thing");
      expect(admin.email).toBe(adminUserEmail);
    });

    it("should error if user is not an admin", async () => {
      (getLoggedInUserSession as jest.Mock).mockResolvedValue({
        name: "Sally Standard",
        email: "standard@user.com",
      });
      await expect(getCheckAdmin("do a thing")).rejects.toThrow();
    });
  });

  describe("notFoundUnlessAdmin", () => {
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

  describe("getCheckAnyAdmin", () => {
    it("should return admin if user is an admin", async () => {
      const admin = await getCheckAnyAdmin("do a thing");
      expect(admin.email).toBe(adminUserEmail);
    });

    it("should error if user is a standard user", async () => {
      (getLoggedInUserSession as jest.Mock).mockResolvedValue({
        name: "Sally Standard",
        email: "standard@user.com",
      });
      await expect(getCheckAnyAdmin("do a thing")).rejects.toThrow();
    });
  });

  describe("notFoundUnlessAnyAdmin", () => {
    it("should do nothing if user is an admin", async () => {
      await notFoundUnlessAnyAdmin();
      expect(notFound).not.toHaveBeenCalled();
    });

    it("should notFound if user is a standard user", async () => {
      (getLoggedInUserSession as jest.Mock).mockResolvedValue({
        name: "Sally Standard",
        email: "standard@user.com",
      });
      await notFoundUnlessAnyAdmin();
      expect(notFound).toHaveBeenCalled();
    });
  });

  describe("hasRelevantProgramAreaAccess", () => {
    it("should return true for admin user", async () => {
      const adminUser = await getCheckAdmin("check");
      const res = await hasRelevantProgramAreaAccess(adminUser, [
        "some-prog-uuid",
      ]);
      expect(res).toBeTrue();
    });

    it("should return false for an inactive user", async () => {
      const adminUser = await getCheckAdmin("check");
      const inactiveUser = { ...adminUser, status: "inactive" as const };
      expect(
        await hasRelevantProgramAreaAccess(inactiveUser, ["some-prog-uuid"]),
      ).toBeFalse();
    });

    it("should return false when no user is passed and none is logged in", async () => {
      (getLoggedInUserSession as jest.Mock).mockResolvedValue(undefined);
      expect(
        await hasRelevantProgramAreaAccess(undefined, ["some-prog-uuid"]),
      ).toBeFalse();
    });
  });

  // TODO ANGELA: Should this really be an integration test? Should this (and others be moved to unit tests)
  describe("validateAdminUserPermissions", () => {
    it("should allow admins to manage users of any type", async () => {
      await expect(
        validateAdminUserPermissions(expectedAdminUser, "admin", []),
      ).resolves.toBeUndefined();
    });
    it("should allow program admins to manage standard users and program admins within their accessible program areas", async () => {
      await expect(
        validateAdminUserPermissions(expectedProgramAdminUser, "standard", [
          programArea123Id!,
        ]),
      ).resolves.toBeUndefined();
      await expect(
        validateAdminUserPermissions(expectedProgramAdminUser, "prog_admin", [
          programArea123Id!,
        ]),
      ).resolves.toBeUndefined();
    });
    it("should prevent program admins from managing admin users", async () => {
      await expect(
        validateAdminUserPermissions(expectedProgramAdminUser, "admin", []),
      ).rejects.toThrow(UserFacingError);
    });
    it("should prevent program admins from managing users outside of their accessible program areas", async () => {
      // Create unauthorized program area
      programAreaUnauthorizedId = await createProgramArea(
        programAreaUnauthorized,
      );
      expect(programAreaUnauthorizedId).toMatch(UUID_REGEX);

      await expect(
        validateAdminUserPermissions(expectedProgramAdminUser, "standard", [
          programAreaUnauthorizedId!,
        ]),
      ).rejects.toThrow(UserFacingError);
    });
  });
});
