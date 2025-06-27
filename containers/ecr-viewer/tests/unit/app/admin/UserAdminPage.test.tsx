import { act, render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { notFound } from "next/navigation";

import { FormProgram, ProgramFieldSet } from "@/app/admin/user/UserForm";
import CreateUserPage from "@/app/admin/user/create/page";
import UserAdminPage from "@/app/admin/user/page";
import { listProgramAreas } from "@/app/services/programAreaService";
import {
  isAdmin,
  ListedUser,
  listUsers,
  notFoundUnlessAdmin,
} from "@/app/services/userService";

jest.mock("@/app/data/metadataDb/database");
jest.mock("@/app/utils/auth-utils", () => ({
  isLoggedInUser: jest.fn().mockResolvedValue(true),
}));
jest.mock("@/app/components/AuthSessionProvider", () => ({
  useIsLoggedInUser: () => true,
}));
jest.mock("@/app/services/userService");
jest.mock("@/app/services/programAreaService");
jest.mock("@/app/services/listConditionsService", () => ({
  listConditionReferences: jest.fn().mockResolvedValue([]),
}));

const mockUsers: ListedUser[] = [
  {
    uuid: "123",
    email: "admin@admin.com",
    name: "Adam Admin",
    date_of_last_login: new Date("2025-04-15T10:30:00Z"),
    user_type: "admin",
    status: "Active",
    date_created: new Date("2025-01-01T09:00:00Z"),
    author_uuid: "123",
    program_areas: [],
  },
  {
    uuid: "234",
    email: "sallystandard@standard.com",
    name: "Sally Standard",
    date_of_last_login: new Date("2025-04-15T10:30:00Z"),
    user_type: "standard",
    status: "Active",
    date_created: new Date("2025-01-01T09:00:00Z"),
    author_uuid: "123",
    program_areas: [
      {
        program_area_uuid: "456",
        user_uuid: "234",
        name: "Program Area Two",
      },
      {
        program_area_uuid: "789",
        user_uuid: "234",
        name: "Program Area Three",
      },
    ],
  },
  {
    uuid: "345",
    email: "stevenstandard@standard.com",
    name: "Steven Standard",
    date_of_last_login: null,
    user_type: "standard",
    status: "Active",
    date_created: new Date("2025-01-02T09:00:00Z"),
    author_uuid: "123",
    program_areas: [
      {
        program_area_uuid: "789",
        user_uuid: "345",
        name: "Program Area Three",
      },
    ],
  },
];

const mockPrograms: FormProgram[] = [
  {
    name: "Program Area Two",
    uuid: "456",
    date_created: new Date("2025-01-05"),
    author_uuid: "abc",
    conditions: [
      {
        code: "123",
        concept_name: "condition (disease)",
        condition_name: "condition",
        condition_category: "category",
        program_area_uuid: "456",
      },
    ],
  },
  {
    name: "Program Area Three",
    uuid: "789",
    date_created: new Date("2025-01-09"),
    author_uuid: "abc",
    conditions: [
      {
        code: "456",
        concept_name: "condition 1 (disease)",
        condition_name: "condition",
        condition_category: "category",
        program_area_uuid: "789",
      },
      {
        code: "789",
        concept_name: "condition 2 (disease)",
        condition_name: "condition",
        condition_category: "category",
        program_area_uuid: "789",
      },
    ],
  },
];

describe("User Admin Page", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should check user is an admin", async () => {
    (isAdmin as unknown as jest.Mock).mockReturnValue(false);
    (listUsers as jest.Mock).mockResolvedValue([]);
    (listProgramAreas as jest.Mock).mockResolvedValue([]);

    render(await UserAdminPage());
    expect(notFoundUnlessAdmin).toHaveBeenCalled();
  });

  it("should list users when available", async () => {
    (notFoundUnlessAdmin as unknown as jest.Mock).mockReturnValue(true);
    (listUsers as jest.Mock).mockResolvedValue(mockUsers);
    (listProgramAreas as jest.Mock).mockResolvedValue(mockPrograms);

    const { container } = render(await UserAdminPage());
    expect(notFound).not.toHaveBeenCalled();
    expect(container).toMatchSnapshot();
  });

  describe("Creating users", () => {
    it("should render a create user page", async () => {
      (listProgramAreas as jest.Mock).mockResolvedValue(mockPrograms);
      const { container } = render(await CreateUserPage());
      expect(container).toMatchSnapshot();
      let results;
      await act(async () => {
        results = await axe(container);
      });
      expect(results).toHaveNoViolations();
    });

    it("when creating an admin user, should not be able to choose program area access", async () => {
      const setPrograms = jest.fn();
      const numProgramsSelected = mockPrograms.filter((p) => p.checked).length;
      const userType = "admin";

      render(
        <ProgramFieldSet
          programs={mockPrograms}
          setPrograms={setPrograms}
          numProgramsSelected={numProgramsSelected}
          userType={userType}
        />,
      );
      // Checkboxes to select programs should not appear
      const checkboxes = screen.queryAllByRole("checkbox");
      expect(checkboxes.length).toBe(0);

      // Select all / deselect all buttons should not appear
      const selectAll = screen.queryByRole("button", { name: /Select all/i });
      const deselectAll = screen.queryByRole("button", {
        name: /Deselect all/i,
      });
      expect(selectAll).not.toBeInTheDocument();
      expect(deselectAll).not.toBeInTheDocument();
    });
  });
});
