import { User } from "@/app/data/metadataDb/types/core";
import { UserFacingError } from "@/app/services/errorService";
import {
  getCheckAdmin,
  getCheckAnyAdmin,
  hasRelevantUserAccess,
  hasRelevantProgramAreaAccess,
  isLoggedInUserEcrAuthed,
  isUserEcrAuthed,
  notFoundUnlessAdmin,
  notFoundUnlessAnyAdmin,
  validateAdminUserPermissions,
} from "@/app/services/userService";
import { getLoggedInUser } from "@/app/services/loggedInUserService";
import { notFound } from "next/navigation";

const accessibleProgramAreaId = "123";
const inaccessibleProgramAreaId = "456";

jest.mock("@/app/services/loggedInUserService", () => ({
  getLoggedInUser: jest.fn(),
  getUserByEmail: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  notFound: jest.fn(),
}));

const adminUserEmail = "admin@admin.com";
const programAdminEmail = "programadmin@programadmin.com";
const standardUserEmail = "standard@standard.com";

const adminUser: User = {
  uuid: "001",
  email: adminUserEmail,
  name: "Admin",
  date_of_last_login: null,
  user_type: "admin",
  status: "active",
  date_created: new Date(),
  author_uuid: "001",
};

const programAdminUser: User = {
  ...adminUser,
  uuid: "002",
  email: programAdminEmail,
  user_type: "prog_admin",
};

const standardUser: User = {
  ...adminUser,
  uuid: "003",
  email: standardUserEmail,
  user_type: "standard",
};

beforeEach(() => {
  jest.clearAllMocks();
  // Default: logged in user is admin
  (getLoggedInUser as jest.Mock).mockResolvedValue(adminUser);
});

jest.mock("@/app/data/metadataDb/database", () => ({
  getDb: jest.fn(() => ({
    selectFrom: jest.fn(() => {
      const programAreaValues: string[] = [];
      let isUserQuery = false;
      const query: {
        select: jest.Mock;
        selectAll: jest.Mock;
        where: jest.Mock;
        innerJoin: jest.Mock;
        executeTakeFirst: jest.Mock;
        execute: jest.Mock;
      } = {
        select: jest.fn(() => query),
        selectAll: jest.fn((...fields: unknown[]) => {
          isUserQuery = fields.length === 0;
          return query;
        }),
        where: jest.fn(
          (
            _column: string,
            _operator: string,
            value: string | (() => void),
          ) => {
            if (typeof value === "string") programAreaValues.push(value);
            return query;
          },
        ),
        innerJoin: jest.fn(() => query),
        executeTakeFirst: jest.fn(async () =>
          isUserQuery
            ? {
                ...standardUser,
                uuid: programAreaValues[0],
                status:
                  programAreaValues[0] === "inactive-user"
                    ? "inactive"
                    : "active",
              }
            : programAreaValues.includes(accessibleProgramAreaId)
              ? { program_area_uuid: accessibleProgramAreaId }
              : undefined,
        ),
        execute: jest.fn(async () =>
          programAreaValues.includes("no-shared-user")
            ? []
            : [{ uuid: accessibleProgramAreaId }],
        ),
      };
      return query;
    }),
  })),
}));

describe("userService", () => {
  describe("isLoggedInUserEcrAuthed", () => {
    it("admin should be authed to see ecr", async () => {
      const res = await isLoggedInUserEcrAuthed("some-ecr-id");
      expect(res).toBeTrue();
    });

    it("should not authorize a user when no user is logged in", async () => {
      (getLoggedInUser as jest.Mock).mockResolvedValue(undefined);

      const res = await isLoggedInUserEcrAuthed("some-ecr-id");

      expect(res).toBeFalse();
    });
  });

  describe("isUserEcrAuthed", () => {
    it("should authorize a user with access to the eCR's program area", async () => {
      const res = await isUserEcrAuthed(
        "some-user-id",
        accessibleProgramAreaId,
      );

      expect(res).toBeTrue();
    });

    it("should not authorize a user without access to the eCR's program area", async () => {
      const res = await isUserEcrAuthed(
        "some-user-id",
        inaccessibleProgramAreaId,
      );

      expect(res).toBeFalse();
    });
  });

  describe("getCheckAdmin", () => {
    it("should return admin if user is an admin", async () => {
      const admin = await getCheckAdmin("do a thing");
      expect(admin.email).toBe(adminUserEmail);
    });

    it("should error if user is not an admin", async () => {
      (getLoggedInUser as jest.Mock).mockResolvedValue(undefined);
      await expect(getCheckAdmin("do a thing")).rejects.toThrow();
    });
  });

  describe("getCheckAnyAdmin", () => {
    it("should return admin if user is an admin", async () => {
      const admin = await getCheckAnyAdmin("do a thing");
      expect(admin.email).toBe(adminUserEmail);
    });

    it("should return admin if user is a program admin", async () => {
      (getLoggedInUser as jest.Mock).mockResolvedValue(programAdminUser);
      const programAdmin = await getCheckAnyAdmin("do a thing");
      expect(programAdmin.email).toBe(programAdminEmail);
    });

    it("should error if user is a standard user", async () => {
      (getLoggedInUser as jest.Mock).mockResolvedValue(standardUser);
      await expect(getCheckAnyAdmin("do a thing")).rejects.toThrow();
    });
  });

  describe("notFoundUnlessAdmin", () => {
    it("should do nothing if user is an admin", async () => {
      await notFoundUnlessAdmin();
      expect(notFound).not.toHaveBeenCalled();
    });

    it("should notFound if user is not an admin", async () => {
      (getLoggedInUser as jest.Mock).mockResolvedValue(standardUser);
      await notFoundUnlessAdmin();
      expect(notFound).toHaveBeenCalled();
    });
  });

  describe("notFoundUnlessAnyAdmin", () => {
    it("should do nothing if user is an admin", async () => {
      await notFoundUnlessAnyAdmin();
      expect(notFound).not.toHaveBeenCalled();
    });

    it("should do nothing if user is a program admin", async () => {
      await notFoundUnlessAnyAdmin();
      expect(notFound).not.toHaveBeenCalled();
    });

    it("should notFound if user is a standard user", async () => {
      (getLoggedInUser as jest.Mock).mockResolvedValue(standardUser);
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
      (getLoggedInUser as jest.Mock).mockResolvedValue(undefined);
      expect(
        await hasRelevantProgramAreaAccess(undefined, ["some-prog-uuid"]),
      ).toBeFalse();
    });
  });

  describe("hasRelevantUserAccess", () => {
    it("should return true for an active user sharing a program area", async () => {
      await expect(hasRelevantUserAccess("target-user")).resolves.toBeTrue();
    });

    it("should return false when users do not share a program area", async () => {
      await expect(
        hasRelevantUserAccess("no-shared-user"),
      ).resolves.toBeFalse();
    });

    it("should return false for an inactive user", async () => {
      await expect(hasRelevantUserAccess("inactive-user")).resolves.toBeFalse();
    });
  });

  describe("validateAdminUserPermissions", () => {
    it("allows admins to manage users of any type", async () => {
      await expect(
        validateAdminUserPermissions({
          loggedInUser: adminUser,
          action: "create",
          targetUserType: "admin",
          targetProgramAreaUuids: [],
        }),
      ).resolves.toBeUndefined();
    });

    it("allows program admins to create users in accessible program areas", async () => {
      await expect(
        validateAdminUserPermissions({
          loggedInUser: programAdminUser,
          action: "create",
          targetUserType: "standard",
          targetProgramAreaUuids: [accessibleProgramAreaId],
        }),
      ).resolves.toBeUndefined();
      await expect(
        validateAdminUserPermissions({
          loggedInUser: programAdminUser,
          action: "create",
          targetUserType: "prog_admin",
          targetProgramAreaUuids: [accessibleProgramAreaId],
        }),
      ).resolves.toBeUndefined();
    });

    it("should invalidate program admins from managing admin users", async () => {
      await expect(
        validateAdminUserPermissions({
          loggedInUser: programAdminUser,
          action: "create",
          targetUserType: "admin",
          targetProgramAreaUuids: [],
        }),
      ).rejects.toThrow(UserFacingError);
    });

    it("should invalidate program admins from creating users outside their accessible program areas", async () => {
      await expect(
        validateAdminUserPermissions({
          loggedInUser: programAdminUser,
          action: "create",
          targetUserType: "standard",
          targetProgramAreaUuids: [inaccessibleProgramAreaId],
        }),
      ).rejects.toThrow(UserFacingError);
    });

    it("should invalidate program admins from editing users outside their program areas", async () => {
      await expect(
        validateAdminUserPermissions({
          loggedInUser: programAdminUser,
          action: "edit",
          targetUserUuid: "no-shared-user",
          targetProgramAreaUuids: [],
        }),
      ).rejects.toThrow(UserFacingError);
    });

    it("should invalidate program admins from editing a user's role or email", async () => {
      await expect(
        validateAdminUserPermissions({
          loggedInUser: programAdminUser,
          action: "edit",
          targetUserUuid: "target-user",
          targetUserType: "standard",
          targetProgramAreaUuids: [],
        }),
      ).rejects.toThrow(UserFacingError);

      await expect(
        validateAdminUserPermissions({
          loggedInUser: programAdminUser,
          action: "edit",
          targetUserUuid: "target-user",
          targetEmail: "updated@example.com",
          targetProgramAreaUuids: [],
        }),
      ).rejects.toThrow(UserFacingError);
    });

    it("should invalidate program admins from assigning inaccessible program areas while editing", async () => {
      await expect(
        validateAdminUserPermissions({
          loggedInUser: programAdminUser,
          action: "edit",
          targetUserUuid: "target-user",
          targetProgramAreaUuids: [inaccessibleProgramAreaId],
        }),
      ).rejects.toThrow(UserFacingError);
    });

    it("allows program admins to assign accessible program areas while editing", async () => {
      await expect(
        validateAdminUserPermissions({
          loggedInUser: programAdminUser,
          action: "edit",
          targetUserUuid: "target-user",
          targetProgramAreaUuids: [accessibleProgramAreaId],
        }),
      ).resolves.toBeUndefined();
    });
  });
});
