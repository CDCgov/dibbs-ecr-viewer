import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ProgramForm } from "@/app/admin/program/ProgramForm";

jest.mock("../../data/metadataDb/database");
jest.mock("../../services/programAreaService");
jest.mock("../../utils/auth-utils", () => ({
  isLoggedInUser: jest.fn().mockResolvedValue(true),
}));
jest.mock("../../components/AuthSessionProvider", () => ({
  useIsLoggedInUser: () => true,
}));
jest.mock("../../services/userService");

describe("ProgramForm", () => {
  it("should render a blank form", async () => {
    render(
      <ProgramForm
        action="Create"
        initValues={{
          conditions: [
            {
              code: "456",
              concept_name: "condition 1 (disease)",
              condition_name: "condition 1",
              condition_category: "first category",
              program_area_uuid: null,
              program_area_name: null,
            },
            {
              code: "789",
              concept_name: "condition 2 (disease)",
              condition_name: "condition 2",
              condition_category: "first category",
              program_area_uuid: "789",
              program_area_name: "A Program Area",
            },
            {
              code: "123",
              concept_name: "condition 3 (disease)",
              condition_name: "condition 3",
              condition_category: "other category",
              program_area_uuid: null,
              program_area_name: null,
            },
          ],
        }}
        submitAction={async () => {}}
      />,
    );

    // no name or conditions selected yet
    const submitButtons = screen.getAllByRole("button", {
      name: "Create program area",
    });
    expect(submitButtons).toHaveLength(2);
    expect(submitButtons[0]).toBeDisabled();
    expect(screen.getByText("Condition in A Program Area")).toBeVisible();

    const user = userEvent.setup();

    const nameInput = screen.getByLabelText("Program area name*");
    await user.type(nameInput, "All of the Diseases");

    // still disabled
    expect(submitButtons[0]).toBeDisabled();

    const checkboxes = screen.getAllByRole("checkbox");
    for (const checkbox of checkboxes) {
      expect(checkbox).not.toBeChecked();
    }

    const selectButtons = screen.getAllByRole("button", { name: "Select all" });
    expect(selectButtons).toHaveLength(2);
    expect(selectButtons[0]).not.toBeDisabled();

    const deselectButtons = screen.getAllByRole("button", {
      name: "Deselect all",
    });
    expect(deselectButtons).toHaveLength(2);
    expect(deselectButtons[0]).not.toBeDisabled();

    // select all in first cateogry and cancel
    await user.click(selectButtons[0]);
    expect(
      screen.getByText(
        "Are you sure you want to add all conditions from first category?",
      ),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    for (const checkbox of checkboxes) {
      expect(checkbox).not.toBeChecked();
    }

    // select the unassigned in first cateogry
    await user.click(screen.getByRole("checkbox", { name: "condition 1" }));
    expect(submitButtons[0]).not.toBeDisabled();
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).not.toBeChecked();
    expect(checkboxes[2]).not.toBeChecked();

    // select all in first cateogry and continue
    await user.click(selectButtons[0]);
    expect(
      screen.getByText(
        "Are you sure you want to add all conditions from first category?",
      ),
    ).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Yes, add all conditions" }),
    );
    expect(submitButtons[0]).not.toBeDisabled();
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).toBeChecked();
    expect(checkboxes[2]).not.toBeChecked();

    // deselect all in first category
    await user.click(deselectButtons[0]);
    expect(submitButtons[0]).toBeDisabled();
    expect(checkboxes[0]).not.toBeChecked();
    expect(checkboxes[1]).not.toBeChecked();
    expect(checkboxes[2]).not.toBeChecked();

    // select the assigned in first cateogry
    await user.click(screen.getByRole("checkbox", { name: "condition 2" }));
    expect(
      screen.getByText("Are you sure you want to add condition 2?"),
    ).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Yes, add condition" }),
    );
    expect(submitButtons[0]).not.toBeDisabled();
    expect(checkboxes[0]).not.toBeChecked();
    expect(checkboxes[1]).toBeChecked();
    expect(checkboxes[2]).not.toBeChecked();

    // select all (should go through without modal since only unchecked are unassigned)
    await user.click(selectButtons[0]);
    expect(submitButtons[0]).not.toBeDisabled();
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).toBeChecked();
    expect(checkboxes[2]).not.toBeChecked();
  });

  it("should render a filled out form", async () => {
    render(
      <ProgramForm
        action="Edit"
        progUuid="789"
        initValues={{
          name: "I have a name",
          conditions: [
            {
              code: "456",
              concept_name: "condition 1 (disease)",
              condition_name: "condition 1",
              condition_category: "first category",
              program_area_uuid: null,
              program_area_name: null,
            },
            {
              code: "789",
              concept_name: "condition 2 (disease)",
              condition_name: "condition 2",
              condition_category: "first category",
              program_area_uuid: "789",
              program_area_name: "A Program Area",
              checked: true,
            },
            {
              code: "123",
              concept_name: "condition 3 (disease)",
              condition_name: "condition 3",
              condition_category: "other category",
              program_area_uuid: null,
              program_area_name: null,
            },
          ],
        }}
        submitAction={async () => {}}
      />,
    );

    // valid due to initial inputs
    const submitButtons = screen.getAllByRole("button", {
      name: "Edit program area",
    });
    expect(submitButtons).toHaveLength(2);
    expect(submitButtons[0]).toBeEnabled();
    expect(
      screen.queryByText("Condition in A Program Area"),
    ).not.toBeInTheDocument();

    const nameInput = screen.getByLabelText("Program area name*");
    expect(nameInput).toHaveValue("I have a name");

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes[0]).not.toBeChecked();
    expect(checkboxes[1]).toBeChecked();
    expect(checkboxes[2]).not.toBeChecked();

    const user = userEvent.setup();

    // deselect the currently assigned condition
    await user.click(screen.getByRole("checkbox", { name: "condition 2" }));
    expect(submitButtons[0]).toBeDisabled();
    expect(checkboxes[0]).not.toBeChecked();
    expect(checkboxes[1]).not.toBeChecked();
    expect(checkboxes[2]).not.toBeChecked();

    // select all in first category
    const selectButtons = screen.getAllByRole("button", { name: "Select all" });
    await user.click(selectButtons[0]);
    expect(submitButtons[0]).not.toBeDisabled();
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).toBeChecked();
    expect(checkboxes[2]).not.toBeChecked();

    // search and deselect all on condition 2
    await user.type(screen.getByPlaceholderText("Search conditions"), "2");
    expect(screen.getByText("1 result")).toBeInTheDocument();
    const deselectButtons = screen.getAllByRole("button", {
      name: "Deselect all",
    });
    await user.click(deselectButtons[0]);
    expect(submitButtons[0]).not.toBeDisabled();
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).not.toBeChecked();
    expect(checkboxes[2]).not.toBeChecked();
  });
});
