import { User } from "@/app/data/metadataDb/types/core";
import { listAdminConditionReferencesQuery } from "@/app/services/listConditionsService";
import { validateAdminConditionAccess } from "@/app/services/programAreaService";
import { isAdmin } from "@/app/services/userService";

jest.mock("@/app/services/listConditionsService", () => ({
  listAdminConditionReferencesQuery: jest.fn(),
}));

jest.mock("@/app/services/auditLogService", () => ({
  audit: jest.fn((_subject, _action, fn) => fn),
}));

jest.mock("@/app/services/userService", () => ({
  isAdmin: jest.fn(),
}));

const programAdmin: User = {
  uuid: "program-admin-uuid",
  email: "programadmin@example.com",
  name: "Program Admin",
  date_of_last_login: null,
  user_type: "prog_admin",
  status: "active",
  date_created: new Date(),
  author_uuid: "admin-uuid",
};

const transaction = {} as never;

beforeEach(() => {
  jest.clearAllMocks();
  (isAdmin as unknown as jest.Mock).mockReturnValue(false);
  (listAdminConditionReferencesQuery as jest.Mock).mockResolvedValue([
    { code: "accessible" },
  ]);
});

describe("validateAdminConditionAccess", () => {
  it.each([
    { scenario: "an empty condition list", conditions: [] },
    {
      scenario: "a condition the program admin can access",
      conditions: ["accessible"],
    },
  ])("allows $scenario", async ({ conditions }) => {
    await expect(
      validateAdminConditionAccess(programAdmin, conditions, transaction),
    ).resolves.toBeUndefined();
  });

  it("for admins, can manage any conditions", async () => {
    (isAdmin as unknown as jest.Mock).mockReturnValue(true);

    await expect(
      validateAdminConditionAccess(programAdmin, ["inaccessible"], transaction),
    ).resolves.toBeUndefined();

    expect(listAdminConditionReferencesQuery).not.toHaveBeenCalled();
  });

  it("for a program admin, rejects when a condition is inaccessible from their program areas", async () => {
    await expect(
      validateAdminConditionAccess(
        programAdmin,
        ["accessible", "inaccessible"],
        transaction,
      ),
    ).rejects.toThrow(
      "Program admins cannot manage conditions outside of their program areas.",
    );
  });
});
