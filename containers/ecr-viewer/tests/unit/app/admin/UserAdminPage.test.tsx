import { act, render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { notFound } from "next/navigation";

import { FormProgram, ProgramFieldSet } from "@/app/admin/user/UserForm";
import CreateUserPage from "@/app/admin/user/create/page";
import EditUserPage from "@/app/admin/user/edit/page";
import UserAdminPage from "@/app/admin/user/page";
import { listProgramAreas } from "@/app/services/programAreaService";
import {
  isAdmin,
  getUser,
  ListedUser,
  listUsers,
  listUserProgramAreas,
  notFoundUnlessAnyAdmin,
} from "@/app/services/userService";
import { getLoggedInUser } from "@/app/services/loggedInUserService";

jest.mock("@/app/data/metadataDb/database");
jest.mock("@/app/utils/auth-utils", () => ({
  isLoggedInUser: jest.fn().mockResolvedValue(true),
}));
jest.mock("@/app/components/AuthSessionProvider", () => ({
  useIsLoggedInUser: () => true,
}));
jest.mock("@/app/services/userService");
jest.mock("@/app/services/loggedInUserService");
jest.mock("@/app/services/programAreaService");
jest.mock("@/app/services/listConditionsService", () => ({
  listConditionReferences: jest.fn().mockResolvedValue([]),
}));

const mockAdmin: ListedUser = {
  uuid: "123",
  email: "admin@admin.com",
  name: "Adam Admin",
  date_of_last_login: new Date("2025-04-15T10:30:00Z"),
  user_type: "admin",
  status: "active",
  date_created: new Date("2025-01-01T09:00:00Z"),
  author_uuid: "123",
  program_areas: [],
};
const mockProgramAdmin: ListedUser = {
  uuid: "456",
  email: "programadmin@programadmin.com",
  name: "Peter Program-Admin",
  date_of_last_login: new Date("2025-04-15T10:30:00Z"),
  user_type: "prog_admin",
  status: "active",
  date_created: new Date("2025-01-01T09:00:00Z"),
  author_uuid: "123",
  program_areas: [
    {
      program_area_uuid: "222",
      user_uuid: "456",
      name: "Program Area Two",
    },
  ],
};
const mockUsers: ListedUser[] = [
  mockAdmin,
  mockProgramAdmin,
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
        program_area_uuid: "222",
        user_uuid: "234",
        name: "Program Area Two",
      },
      {
        program_area_uuid: "333",
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
        program_area_uuid: "333",
        user_uuid: "345",
        name: "Program Area Three",
      },
    ],
  },
];

const mockPrograms: FormProgram[] = [
  {
    name: "Program Area Two",
    uuid: "222",
    date_created: new Date("2025-01-05"),
    author_uuid: "abc",
    conditions: [
      {
        code: "cond0",
        concept_name: "condition (disease)",
        condition_name: "condition",
        condition_category: "category",
        program_area_uuid: "456",
        is_duplicate: false,
      },
    ],
  },
  {
    name: "Program Area Three",
    uuid: "333",
    date_created: new Date("2025-01-09"),
    author_uuid: "abc",
    conditions: [
      {
        code: "cond1",
        concept_name: "condition 1 (disease)",
        condition_name: "condition",
        condition_category: "category",
        program_area_uuid: "333",
        is_duplicate: false,
      },
      {
        code: "cond2",
        concept_name: "condition 2 (disease)",
        condition_name: "condition",
        condition_category: "category",
        program_area_uuid: "333",
        is_duplicate: false,
      },
    ],
  },
];

describe("User Admin Page", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should check user is an admin", async () => {
    (listUsers as jest.Mock).mockResolvedValue([]);
    (listProgramAreas as jest.Mock).mockResolvedValue([]);

    render(await UserAdminPage());
    expect(notFoundUnlessAnyAdmin).toHaveBeenCalled();
  });

  it("for an admin, should list all users and program areas", async () => {
    (notFoundUnlessAnyAdmin as unknown as jest.Mock).mockReturnValue(true);
    (getLoggedInUser as jest.Mock).mockResolvedValue(mockAdmin);
    (isAdmin as unknown as jest.Mock).mockReturnValue(true);
    (listUsers as jest.Mock).mockResolvedValue(mockUsers);
    (listProgramAreas as jest.Mock).mockResolvedValue(mockPrograms);

    const { container } = render(await UserAdminPage());
    expect(notFound).not.toHaveBeenCalled();
    expect(listProgramAreas).toHaveBeenCalledTimes(1);
    expect(listProgramAreas).toHaveBeenCalledWith();
    expect(container).toMatchSnapshot();
  });

  it("for a program admin, should list all users in their program area(s)", async () => {
    (notFoundUnlessAnyAdmin as unknown as jest.Mock).mockReturnValue(true);
    (getLoggedInUser as jest.Mock).mockResolvedValue(mockProgramAdmin);
    (isAdmin as unknown as jest.Mock).mockReturnValue(false);
    (listUsers as jest.Mock).mockResolvedValue([
      mockProgramAdmin,
      mockUsers[2],
    ]);
    (listProgramAreas as jest.Mock)
      .mockResolvedValueOnce([mockPrograms[0]])
      .mockResolvedValueOnce(mockPrograms);

    render(await UserAdminPage());

    expect(listProgramAreas).toHaveBeenNthCalledWith(1); // Get program areas for filtering
    expect(listProgramAreas).toHaveBeenNthCalledWith(2, {
      // List all of Sally's program areas
      userUuids: ["456", "234"],
    });
    expect(screen.getByText("sallystandard@standard.com")).toBeInTheDocument();
    expect(
      screen.queryByText("stevenstandard@standard.com"),
    ).not.toBeInTheDocument();
  });

  describe("Creating users", () => {
    it("should render a create user page", async () => {
      (isAdmin as unknown as jest.Mock).mockReturnValue(true);
      (listProgramAreas as jest.Mock).mockResolvedValue(mockPrograms);

      const { container } = render(await CreateUserPage());
      expect(container).toMatchSnapshot();
      let results;
      await act(async () => {
        results = await axe(container);
      });
      expect(results).toHaveNoViolations();
    });

    it("should render a create user page with no programs", async () => {
      (isAdmin as unknown as jest.Mock).mockReturnValue(true);
      (listProgramAreas as jest.Mock).mockResolvedValue([]);
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

    it("As a program admin, can only create other program admins or standard users", async () => {
      (isAdmin as unknown as jest.Mock).mockReturnValue(false);
      (notFoundUnlessAnyAdmin as unknown as jest.Mock).mockResolvedValue(true);
      (listProgramAreas as jest.Mock).mockResolvedValue(mockPrograms);
      (getLoggedInUser as jest.Mock).mockResolvedValue(mockProgramAdmin);

      render(await CreateUserPage());

      expect(
        screen.getByRole("radio", { name: /Program Admin/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("radio", { name: /Standard/i }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("radio", { name: /^Admin$/i }),
      ).not.toBeInTheDocument();
    });

    it("As a program admin, can only create users in their program areas", async () => {
      (isAdmin as unknown as jest.Mock).mockReturnValue(false);
      (notFoundUnlessAnyAdmin as unknown as jest.Mock).mockResolvedValue(true);
      (listProgramAreas as jest.Mock).mockResolvedValue([mockPrograms[0]]);
      (getLoggedInUser as jest.Mock).mockResolvedValue(mockProgramAdmin);

      render(await CreateUserPage());

      expect(
        screen.getByRole("checkbox", { name: /Select Program Area Two/i }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("checkbox", { name: /Select Program Area Three/i }),
      ).not.toBeInTheDocument();
    });

    it("As a standard user, cannot access the Create User page", async () => {
      (notFoundUnlessAnyAdmin as unknown as jest.Mock).mockImplementation(
        () => {
          throw new Error("Not found");
        },
      );

      await expect(CreateUserPage()).rejects.toThrow("Not found");
    });
  });

  describe("Editing users", () => {
    it("as a program admin, should render an edit user page with restricted permissions", async () => {
      (notFoundUnlessAnyAdmin as unknown as jest.Mock).mockResolvedValue(true);
      (getLoggedInUser as unknown as jest.Mock).mockResolvedValue(
        mockProgramAdmin,
      );
      (isAdmin as unknown as jest.Mock).mockReturnValue(false);
      (getUser as jest.Mock).mockResolvedValue(mockUsers[2]);
      (listUserProgramAreas as jest.Mock).mockResolvedValue([mockPrograms[0]]);
      (listProgramAreas as jest.Mock).mockResolvedValue(mockPrograms);
      (listUsers as jest.Mock).mockResolvedValue(mockUsers);

      const { container } = render(
        await EditUserPage({
          searchParams: Promise.resolve({ uuid: "234" }),
        }),
      );
      expect(container).toMatchSnapshot();
      let results;
      await act(async () => {
        results = await axe(container);
      });
      expect(results).toHaveNoViolations();
    });

    it("as a program admin, cannot edit a user's email or user type", async () => {
      (notFoundUnlessAnyAdmin as unknown as jest.Mock).mockResolvedValue(true);
      (getLoggedInUser as jest.Mock).mockResolvedValue(mockProgramAdmin);
      (isAdmin as unknown as jest.Mock).mockReturnValue(false);
      (getUser as jest.Mock).mockResolvedValue(mockUsers[2]);
      (listUserProgramAreas as jest.Mock).mockResolvedValue([mockPrograms[0]]);
      (listProgramAreas as jest.Mock).mockResolvedValue(mockPrograms);
      (listUsers as jest.Mock).mockResolvedValue(mockUsers);

      render(
        await EditUserPage({
          searchParams: Promise.resolve({ uuid: "234" }),
        }),
      );

      expect(screen.getByLabelText(/Email/i)).toBeDisabled();
      expect(screen.getAllByRole("radio")).toHaveLength(2);
      screen
        .getAllByRole("radio")
        .forEach((radio) => expect(radio).toBeDisabled());
    });
  });
});
