import { User } from "@/app/data/metadataDb/types/core";
import { listAdminConditionReferences } from "@/app/services/listConditionsService";
import { validateAdminProgramAreaConditionAccess } from "@/app/services/programAreaService";
import { isAdmin, listUserProgramAreas } from "@/app/services/userService";

jest.mock("@/app/services/listConditionsService", () => ({
  listAdminConditionReferences: jest.fn(),
}));

jest.mock("@/app/services/auditLogService", () => ({
  audit: jest.fn((_subject, _action, fn) => fn),
}));

jest.mock("@/app/services/userService", () => ({
  isAdmin: jest.fn(),
  listUserProgramAreas: jest.fn(),
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
  (listAdminConditionReferences as jest.Mock).mockResolvedValue([
    { code: "accessible" },
  ]);
  (listUserProgramAreas as jest.Mock).mockResolvedValue([
    { uuid: "accessible-program", name: "Current program" },
  ]);
});

describe("validateAdminProgramAreaConditionAccess", () => {
  const validate = (props: { name?: string; conditions?: string[] } = {}) =>
    validateAdminProgramAreaConditionAccess({
      user: programAdmin,
      targetProgramAreaUuid: "accessible-program",
      targetName: props.name,
      targetConditions: props.conditions,
    });

  it.each([
    { scenario: "an empty condition list", conditions: [] },
    {
      scenario: "a condition the program admin can access",
      conditions: ["accessible"],
    },
  ])("allows $scenario", async ({ conditions }) => {
    await expect(validate({ conditions })).resolves.toBeUndefined();
  });

  it("allows admins to manage any program area and conditions", async () => {
    (isAdmin as unknown as jest.Mock).mockReturnValue(true);

    await expect(
      validateAdminProgramAreaConditionAccess({
        user: programAdmin,
        targetProgramAreaUuid: "inaccessible-program",
        targetName: "Renamed program",
        targetConditions: ["inaccessible"],
      }),
    ).resolves.toBeUndefined();

    expect(listUserProgramAreas).not.toHaveBeenCalled();
    expect(listAdminConditionReferences).not.toHaveBeenCalled();
  });

  it("rejects a program area the program admin is not assigned to", async () => {
    await expect(
      validateAdminProgramAreaConditionAccess({
        user: programAdmin,
        targetProgramAreaUuid: "inaccessible-program",
        targetConditions: [],
      }),
    ).rejects.toThrow(
      "Program admins cannot manage program areas they are not assigned to.",
    );
  });

  it("rejects a program area name change", async () => {
    await expect(validate({ name: "Renamed program" })).rejects.toThrow(
      "Program admins cannot update program area names.",
    );
  });

  it("for a program admin, rejects when a condition is inaccessible from their program areas", async () => {
    await expect(
      validate({ conditions: ["accessible", "inaccessible"] }),
    ).rejects.toThrow(
      "Program admins cannot manage conditions outside of their program areas.",
    );
  });
});
