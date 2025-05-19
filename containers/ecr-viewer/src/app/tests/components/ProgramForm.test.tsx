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
            },
            {
              code: "789",
              concept_name: "condition 2 (disease)",
              condition_name: "condition 2",
              condition_category: "first category",
              program_area_uuid: "789",
            },
            {
              code: "123",
              concept_name: "condition 3 (disease)",
              condition_name: "condition 3",
              condition_category: "other category",
              program_area_uuid: null,
            },
          ],
        }}
      />,
    );

    // no name or conditions selected yet
    const submitButtons = screen.getAllByRole("button", {
      name: "Create program area",
    });
    expect(submitButtons).toHaveLength(2);
    expect(submitButtons[0]).toBeDisabled();

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
    expect(deselectButtons[0]).toBeDisabled();

    // select all in first cateogry
    await user.click(selectButtons[0]);
    expect(submitButtons[0]).not.toBeDisabled();
    expect(selectButtons[0]).toBeDisabled();
    expect(deselectButtons[0]).not.toBeDisabled();
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).toBeChecked();
    expect(checkboxes[2]).not.toBeChecked();

    // deselect all in first category
    await user.click(deselectButtons[0]);
    expect(submitButtons[0]).toBeDisabled();
    expect(selectButtons[0]).not.toBeDisabled();
    expect(deselectButtons[0]).toBeDisabled();
    expect(checkboxes[0]).not.toBeChecked();
    expect(checkboxes[1]).not.toBeChecked();
    expect(checkboxes[2]).not.toBeChecked();
  });

  it("should render a filled out form", async () => {
    render(
      <ProgramForm
        action="Create"
        initValues={{
          name: "I have a name",
          conditions: [
            {
              code: "456",
              concept_name: "condition 1 (disease)",
              condition_name: "condition 1",
              condition_category: "first category",
              program_area_uuid: null,
            },
            {
              code: "789",
              concept_name: "condition 2 (disease)",
              condition_name: "condition 2",
              condition_category: "first category",
              program_area_uuid: "789",
              checked: true,
            },
            {
              code: "123",
              concept_name: "condition 3 (disease)",
              condition_name: "condition 3",
              condition_category: "other category",
              program_area_uuid: null,
            },
          ],
        }}
      />,
    );

    // valid due to initial inputs
    const submitButtons = screen.getAllByRole("button", {
      name: "Create program area",
    });
    expect(submitButtons).toHaveLength(2);
    expect(submitButtons[0]).toBeEnabled();

    const nameInput = screen.getByLabelText("Program area name*");
    expect(nameInput).toHaveValue("I have a name");

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes[0]).not.toBeChecked();
    expect(checkboxes[1]).toBeChecked();
    expect(checkboxes[2]).not.toBeChecked();
  });
});
