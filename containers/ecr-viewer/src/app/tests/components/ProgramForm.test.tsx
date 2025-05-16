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
  it("should render a form", () => {
    render(
      <ProgramForm
        action="Create"
        initValues={{
          conditions: [
            {
              code: "456",
              concept_name: "condition 1 (disease)",
              condition_name: "condition 1",
              condition_category: "category",
              program_area_uuid: null,
            },
            {
              code: "789",
              concept_name: "condition 2 (disease)",
              condition_name: "condition 2",
              condition_category: "category",
              program_area_uuid: "789",
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

    // const nameInput = screen.getByRole("textbox", {
    //   name: "Program area name",
    // });
    // user.type(nameInput, "All of the Diseases");
  });
});
