import { User } from "@/app/data/metadataDb/types/core";
import { UserFacingError } from "@/app/services/errorService";
import {
  getCheckAdmin,
  getCheckAnyAdmin,
  hasRelevantProgramAreaAccess,
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
      const query: {
        select: jest.Mock;
        where: jest.Mock;
        executeTakeFirst: jest.Mock;
      } = {
        select: jest.fn(() => query),
        where: jest.fn((_column: string, _operator: string, value: string) => {
          programAreaValues.push(value);
          return query;
        }),
        executeTakeFirst: jest.fn(async () =>
          programAreaValues.includes(accessibleProgramAreaId)
            ? { program_area_uuid: accessibleProgramAreaId }
            : undefined,
        ),
      };
      return query;
    }),
  })),
}));

describe("userService", () => {
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

    it("should notFound if user is a standard user", async () => {
      (getLoggedInUser as jest.Mock).mockResolvedValue(standardUser);
      await notFoundUnlessAnyAdmin();
      expect(notFound).toHaveBeenCalled();
    });
  });

  describe("hasRelevantProgramAreaAccess", () => {
    it("should return true for admin user", async () => {
      const adminUser = await getCheckAdmin("check");
      const res = await hasRelevantProgramAreaAccess(
        adminUser,
        "some-prog-uuid",
      );
      expect(res).toBeTrue();
    });

    it("should return false for an inactive user", async () => {
      const adminUser = await getCheckAdmin("check");
      const inactiveUser = { ...adminUser, status: "inactive" as const };
      expect(
        await hasRelevantProgramAreaAccess(inactiveUser, "some-prog-uuid"),
      ).toBeFalse();
    });

    it("should return false when no user is passed and none is logged in", async () => {
      (getLoggedInUser as jest.Mock).mockResolvedValue(undefined);
      expect(
        await hasRelevantProgramAreaAccess(undefined, "some-prog-uuid"),
      ).toBeFalse();
    });
  });

  // TODO ANGELA: Add for hasRelevantUserAccess

  describe("validateAdminUserPermissions", () => {
    it("allows admins to manage users of any type", async () => {
      await expect(
        validateAdminUserPermissions(adminUser, "admin", [], "create"),
      ).resolves.toBeUndefined();
    });

    it("allows program admins to manage users in accessible program areas", async () => {
      await expect(
        validateAdminUserPermissions(
          programAdminUser,
          "standard",
          [accessibleProgramAreaId],
          "create",
        ),
      ).resolves.toBeUndefined();
      await expect(
        validateAdminUserPermissions(
          programAdminUser,
          "prog_admin",
          [accessibleProgramAreaId],
          "create",
        ),
      ).resolves.toBeUndefined();
    });

    it("prevents program admins from managing admin users", async () => {
      await expect(
        validateAdminUserPermissions(programAdminUser, "admin", [], "create"),
      ).rejects.toThrow(UserFacingError);
    });

    it("prevents program admins from managing users outside their accessible program areas", async () => {
      await expect(
        validateAdminUserPermissions(
          programAdminUser,
          "standard",
          [inaccessibleProgramAreaId],
          "create",
        ),
      ).rejects.toThrow(UserFacingError);
    });
  });
});
