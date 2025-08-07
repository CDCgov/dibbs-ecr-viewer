import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { FormProgram, FormUser, UserForm } from "@/app/admin/user/UserForm";

jest.mock("@/app/data/metadataDb/database");
jest.mock("@/app/services/programAreaService");
jest.mock("@/app/utils/auth-utils", () => ({
  isLoggedInUser: jest.fn().mockResolvedValue(true),
}));
jest.mock("@/app/components/AuthSessionProvider", () => ({
  useIsLoggedInUser: () => true,
}));
jest.mock("@/app/services/userService");
jest.mock("@/app/services/loggedInUserService");

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
        is_duplicate: false,
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
        is_duplicate: false,
      },
      {
        code: "789",
        concept_name: "condition 2 (disease)",
        condition_name: "condition",
        condition_category: "category",
        program_area_uuid: "789",
        is_duplicate: false,
      },
    ],
  },
];
const TEST_EMAIL = "TestUser@abc.com"
const mockUsers: FormUser[] = [
  { 
    uuid: "XYZ",
    name: "Test",
    date_created: new Date("2025-01-01"),
    author_uuid: "abc",
    email: TEST_EMAIL,
    date_of_last_login: new Date("2025-01-01"),
    user_type: "standard",
    status: "active",
    program_areas: [],
  }
]

describe("UserForm", () => {
  it("should render a blank form", async () => {
    render(
      <UserForm
        action="Create"
        initValues={{
          programs: mockPrograms,
          users: mockUsers,
        }}
        submitAction={async () => ({})}
      />,
    );

    // no user info inputted yet
    const submitButtons = screen.getAllByRole("button", {
      name: "Save user",
    });
    expect(submitButtons).toHaveLength(2);
    expect(submitButtons[0]).toBeDisabled();
    expect(screen.getByText("Select one or more program areas")).toBeVisible();

    const user = userEvent.setup();

    // input email
    const emailInput = screen.getByLabelText(/Email/i);
    await user.type(emailInput, "test@test.test");

    // no longer disabled (users don't need to be assigned to any program areas)
    expect(submitButtons[0]).not.toBeDisabled();

    // change user type to admin
    const buttonAdminUser = screen.getAllByRole("radio", {
      name: /admin/i,
    });
    await user.click(buttonAdminUser[0]);

    // admins should not have the choice of choosing programs
    const checkboxes = screen.queryAllByRole("checkbox");
    expect(checkboxes.length).toEqual(0);

    // change user type back to standard
    const buttonStandardUser = screen.getAllByRole("radio", {
      name: /standard/i,
    });
    await user.click(buttonStandardUser[0]);

    // select all programs
    const buttonSelectAll = screen.getAllByRole("button", {
      name: "Select all",
    })[0];
    expect(buttonSelectAll).not.toBeDisabled();
    await user.click(buttonSelectAll);
    for (const checkbox of checkboxes) {
      expect(checkbox).toBeChecked();
    }

    // deselect all programs
    const buttonDeselectAll = screen.getAllByRole("button", {
      name: "Deselect all",
    })[0];
    expect(buttonDeselectAll).not.toBeDisabled();
    await user.click(buttonDeselectAll);
    for (const checkbox of checkboxes) {
      expect(checkbox).not.toBeChecked();
    }

    // change the email to match an already in-use email (but different case)
    await user.clear(emailInput);
    await user.type(emailInput, TEST_EMAIL.toLowerCase());
    expect(submitButtons[0]).toBeDisabled();
    expect(screen.getByText(/This email already exists. Please add a different email./)).toBeVisible();
  });

  it("should render a filled out form", async () => {
    // User should only have Program Area Two checked
    const mockCheckedPrograms = mockPrograms.map((p) =>
      p.name === "Program Area Two" ? { ...p, checked: true } : p,
    );
    const mockSubmitAction = jest.fn().mockResolvedValue({});
    const user = userEvent.setup();

    render(
      <UserForm
        action="Edit"
        initValues={{
          email: "test@test.test",
          userType: "standard",
          programs: mockCheckedPrograms,
          users: [],
        }}
        submitAction={mockSubmitAction}
      />,
    );

    // valid due to initial inputs
    const submitButtons = screen.getAllByRole("button", {
      name: "Save user",
    });
    expect(submitButtons).toHaveLength(2);
    // Not yet touched
    expect(submitButtons[0]).toBeDisabled();

    // Expect email and user type to be filled in
    const emailInput = screen.getByLabelText(/Email/i);
    expect(emailInput).toHaveValue("test@test.test");

    const buttonStandardUser = screen.getAllByRole("radio", {
      name: /standard/i,
    })[0];
    expect(buttonStandardUser).toBeChecked();

    // Expect only Program Area Two to be checked
    const checkboxProgramTwo = screen.getAllByRole("checkbox", {
      name: /Program Area Two/i,
    })[0];
    expect(checkboxProgramTwo).toBeChecked();
    const checkboxProgramThree = screen.getAllByRole("checkbox", {
      name: /Program Area Three/i,
    })[0];
    expect(checkboxProgramThree).not.toBeChecked();

    // Select another program -> switch to admin -> save
    await user.click(checkboxProgramThree);
    expect(checkboxProgramThree).toBeChecked();
    expect(checkboxProgramTwo).toBeChecked();

    const buttonAdmin = screen.getAllByRole("radio", {
      name: /admin/i,
    })[0];
    await user.click(buttonAdmin);
    expect(buttonAdmin).toBeChecked();
    await userEvent.click(submitButtons[0]);

    expect(mockSubmitAction).toHaveBeenCalledWith(
      "test@test.test",
      "admin",
      [], // Admins shouldn't be saved with assigned program areas
    );
  });
});
