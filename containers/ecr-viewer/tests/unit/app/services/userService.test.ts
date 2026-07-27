import { notFound } from "next/navigation";

import { getDb } from "@/app/data/metadataDb/database";
import { User } from "@/app/data/metadataDb/types/core";
import { getLoggedInUser } from "@/app/services/loggedInUserService";
import {
  getCheckAnyAdmin,
  hasRelevantProgramAreaAccess,
  isAdmin,
  isAnyAdmin,
  isProgramAdmin,
  notFoundUnlessAnyAdmin,
} from "@/app/services/userService";

jest.mock("next/navigation", () => ({
  notFound: jest.fn(),
}));

jest.mock("@/app/services/loggedInUserService", () => ({
  getLoggedInUser: jest.fn(),
}));

jest.mock("@/app/data/metadataDb/database", () => ({
  getDb: jest.fn(),
}));

const mockAdminUser: User = {
  uuid: "admin-uuid",
  email: "admin@test.com",
  name: "Admin User",
  date_of_last_login: null,
  user_type: "admin",
  status: "active",
  date_created: new Date(),
  author_uuid: "admin-uuid",
};

const mockProgramAdminUser: User = {
  uuid: "prog-admin-uuid",
  email: "progadmin@test.com",
  name: "Program Admin User",
  date_of_last_login: null,
  user_type: "program_admin",
  status: "active",
  date_created: new Date(),
  author_uuid: "admin-uuid",
};

const mockStandardUser: User = {
  uuid: "standard-uuid",
  email: "standard@test.com",
  name: "Standard User",
  date_of_last_login: null,
  user_type: "standard",
  status: "active",
  date_created: new Date(),
  author_uuid: "admin-uuid",
};

const mockInactiveUser: User = {
  ...mockProgramAdminUser,
  status: "inactive",
};

describe("userService auth helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("isAdmin", () => {
    it("should return true for active admin", () => {
      expect(isAdmin(mockAdminUser)).toBe(true);
    });

    it("should return false for program_admin", () => {
      expect(isAdmin(mockProgramAdminUser)).toBe(false);
    });

    it("should return false for standard user", () => {
      expect(isAdmin(mockStandardUser)).toBe(false);
    });

    it("should return false for undefined or inactive user", () => {
      expect(isAdmin(undefined)).toBe(false);
      expect(isAdmin({ ...mockAdminUser, status: "inactive" })).toBe(false);
    });
  });

  describe("isProgramAdmin", () => {
    it("should return true for active program_admin", () => {
      expect(isProgramAdmin(mockProgramAdminUser)).toBe(true);
    });

    it("should return false for admin", () => {
      expect(isProgramAdmin(mockAdminUser)).toBe(false);
    });

    it("should return false for standard user", () => {
      expect(isProgramAdmin(mockStandardUser)).toBe(false);
    });

    it("should return false for undefined or inactive user", () => {
      expect(isProgramAdmin(undefined)).toBe(false);
      expect(isProgramAdmin(mockInactiveUser)).toBe(false);
    });
  });

  describe("isAnyAdmin", () => {
    it("should return true for admin", () => {
      expect(isAnyAdmin(mockAdminUser)).toBe(true);
    });

    it("should return true for program_admin", () => {
      expect(isAnyAdmin(mockProgramAdminUser)).toBe(true);
    });

    it("should return false for standard user", () => {
      expect(isAnyAdmin(mockStandardUser)).toBe(false);
    });

    it("should return false for undefined or inactive user", () => {
      expect(isAnyAdmin(undefined)).toBe(false);
      expect(isAnyAdmin(mockInactiveUser)).toBe(false);
    });
  });

  describe("getCheckAnyAdmin", () => {
    it("should return logged in user if admin", async () => {
      (getLoggedInUser as jest.Mock).mockResolvedValue(mockAdminUser);
      const res = await getCheckAnyAdmin("do action");
      expect(res).toEqual(mockAdminUser);
    });

    it("should return logged in user if program_admin", async () => {
      (getLoggedInUser as jest.Mock).mockResolvedValue(mockProgramAdminUser);
      const res = await getCheckAnyAdmin("do action");
      expect(res).toEqual(mockProgramAdminUser);
    });

    it("should throw error if logged in user is standard user", async () => {
      (getLoggedInUser as jest.Mock).mockResolvedValue(mockStandardUser);
      await expect(getCheckAnyAdmin("do action")).rejects.toThrow(
        "Standard user cannot do action",
      );
    });

    it("should throw error if logged in user is undefined", async () => {
      (getLoggedInUser as jest.Mock).mockResolvedValue(undefined);
      await expect(getCheckAnyAdmin("do action")).rejects.toThrow(
        "Standard user cannot do action",
      );
    });
  });

  describe("notFoundUnlessAnyAdmin", () => {
    it("should do nothing if logged in user is admin", async () => {
      (getLoggedInUser as jest.Mock).mockResolvedValue(mockAdminUser);
      await notFoundUnlessAnyAdmin();
      expect(notFound).not.toHaveBeenCalled();
    });

    it("should do nothing if logged in user is program_admin", async () => {
      (getLoggedInUser as jest.Mock).mockResolvedValue(mockProgramAdminUser);
      await notFoundUnlessAnyAdmin();
      expect(notFound).not.toHaveBeenCalled();
    });

    it("should call notFound if logged in user is standard user", async () => {
      (getLoggedInUser as jest.Mock).mockResolvedValue(mockStandardUser);
      await notFoundUnlessAnyAdmin();
      expect(notFound).toHaveBeenCalled();
    });

    it("should call notFound if logged in user is undefined", async () => {
      (getLoggedInUser as jest.Mock).mockResolvedValue(undefined);
      await notFoundUnlessAnyAdmin();
      expect(notFound).toHaveBeenCalled();
    });
  });

  describe("hasRelevantProgramAreaAccess", () => {
    it("should return false if user is undefined or inactive", async () => {
      (getLoggedInUser as jest.Mock).mockResolvedValue(undefined);
      expect(await hasRelevantProgramAreaAccess(undefined, "pa-1")).toBe(false);
      expect(
        await hasRelevantProgramAreaAccess(mockInactiveUser, "pa-1"),
      ).toBe(false);
    });

    it("should return true for admin without checking DB", async () => {
      const res = await hasRelevantProgramAreaAccess(mockAdminUser, "pa-1");
      expect(res).toBe(true);
      expect(getDb).not.toHaveBeenCalled();
    });

    it("should check DB and return true if program_admin has program area access", async () => {
      const mockExecuteTakeFirst = jest.fn().mockResolvedValue({
        program_area_uuid: "pa-1",
      });
      const mockWhere2 = jest.fn().mockReturnValue({
        executeTakeFirst: mockExecuteTakeFirst,
      });
      const mockWhere1 = jest.fn().mockReturnValue({
        where: mockWhere2,
      });
      const mockSelect = jest.fn().mockReturnValue({
        where: mockWhere1,
      });
      const mockSelectFrom = jest.fn().mockReturnValue({
        select: mockSelect,
      });
      (getDb as jest.Mock).mockReturnValue({
        selectFrom: mockSelectFrom,
      });

      const res = await hasRelevantProgramAreaAccess(
        mockProgramAdminUser,
        "pa-1",
      );
      expect(res).toBe(true);
      expect(mockSelectFrom).toHaveBeenCalledWith("user_program_area");
      expect(mockWhere1).toHaveBeenCalledWith(
        "user_uuid",
        "=",
        "prog-admin-uuid",
      );
      expect(mockWhere2).toHaveBeenCalledWith("program_area_uuid", "=", "pa-1");
    });

    it("should check DB and return true if standard user has program area access", async () => {
      const mockExecuteTakeFirst = jest.fn().mockResolvedValue({
        program_area_uuid: "pa-1",
      });
      const mockWhere2 = jest.fn().mockReturnValue({
        executeTakeFirst: mockExecuteTakeFirst,
      });
      const mockWhere1 = jest.fn().mockReturnValue({
        where: mockWhere2,
      });
      const mockSelect = jest.fn().mockReturnValue({
        where: mockWhere1,
      });
      const mockSelectFrom = jest.fn().mockReturnValue({
        select: mockSelect,
      });
      (getDb as jest.Mock).mockReturnValue({
        selectFrom: mockSelectFrom,
      });

      const res = await hasRelevantProgramAreaAccess(
        mockStandardUser,
        "pa-1",
      );
      expect(res).toBe(true);
    });

    it("should return false if program_admin does not have program area access", async () => {
      const mockExecuteTakeFirst = jest.fn().mockResolvedValue(undefined);
      const mockWhere2 = jest.fn().mockReturnValue({
        executeTakeFirst: mockExecuteTakeFirst,
      });
      const mockWhere1 = jest.fn().mockReturnValue({
        where: mockWhere2,
      });
      const mockSelect = jest.fn().mockReturnValue({
        where: mockWhere1,
      });
      const mockSelectFrom = jest.fn().mockReturnValue({
        select: mockSelect,
      });
      (getDb as jest.Mock).mockReturnValue({
        selectFrom: mockSelectFrom,
      });

      const res = await hasRelevantProgramAreaAccess(
        mockProgramAdminUser,
        "pa-2",
      );
      expect(res).toBe(false);
    });

    it("should fallback to logged in user if user parameter is undefined", async () => {
      (getLoggedInUser as jest.Mock).mockResolvedValue(mockAdminUser);
      const res = await hasRelevantProgramAreaAccess(undefined, "pa-1");
      expect(res).toBe(true);
    });
  });
});
