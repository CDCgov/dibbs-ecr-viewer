import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { notFound } from "next/navigation";

import ProgramCreatePage from "@/app/admin/program/create/page";
import ProgramAdminPage from "@/app/admin/program/page";
import { listConditionReferences } from "@/app/services/listConditionsService";
import { listProgramAreas } from "@/app/services/programAreaService";
import { isAdmin, notFoundUnlessAdmin } from "@/app/services/userService";

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
describe("Program Admin Page", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should check user is an admin", async () => {
    (isAdmin as unknown as jest.Mock).mockReturnValue(false);
    (listProgramAreas as jest.Mock).mockResolvedValue([]);

    render(await ProgramAdminPage());
    expect(notFoundUnlessAdmin).toHaveBeenCalled();
  });

  it("should show no program areas message if none", async () => {
    (isAdmin as unknown as jest.Mock).mockReturnValue(true);
    (listProgramAreas as jest.Mock).mockResolvedValue([]);

    render(await ProgramAdminPage());
    expect(notFound).not.toHaveBeenCalled();
    expect(screen.getByText("No program areas added")).toBeInTheDocument();
  });

  it("should list program areas when available", async () => {
    (isAdmin as unknown as jest.Mock).mockReturnValue(true);
    (listProgramAreas as jest.Mock).mockResolvedValue([
      {
        name: "Program Area One",
        uuid: "123",
        date_created: new Date("2025-01-01"),
        author_uuid: "456",
        conditions: [],
      },
      {
        name: "Program Area Two",
        uuid: "456",
        date_created: new Date("2025-01-05"),
        author_uuid: "456",
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
        author_uuid: "456",
        conditions: [
          {
            code: "456",
            concept_name: "condition 1 (disease)",
            condition_name: "condition 1 (condition)",
            condition_category: "category",
            program_area_uuid: "789",
            is_duplicate: true,
          },
          {
            code: "789",
            concept_name: "condition 2 (disease)",
            condition_name: "condition 2",
            condition_category: "category",
            program_area_uuid: "789",
            is_duplicate: false,
          },
        ],
      },
    ]);

    const { container } = render(await ProgramAdminPage());
    expect(notFound).not.toHaveBeenCalled();
    expect(
      screen.queryByText("No program areas added"),
    ).not.toBeInTheDocument();
    expect(container).toMatchSnapshot();

    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: "Program Area Three" }),
    );
    expect(screen.getByText("Program area information")).toBeInTheDocument();
    expect(screen.getByText("condition 1 (condition)")).toBeInTheDocument();
    // subtitle due to duplicate status
    expect(screen.getByText("condition 1 (disease)")).toBeInTheDocument();
  });

  describe("Creating programs", () => {
    it("should render a create program page", async () => {
      (listConditionReferences as jest.Mock).mockResolvedValue([
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
      ]);
      const { container } = render(await ProgramCreatePage());
      expect(container).toMatchSnapshot();
      let results;
      await act(async () => {
        results = await axe(container);
      });
      expect(results).toHaveNoViolations();
    });
  });
});
