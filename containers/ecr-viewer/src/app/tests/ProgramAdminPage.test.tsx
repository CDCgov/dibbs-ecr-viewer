import { render, screen } from "@testing-library/react";
import { notFound } from "next/navigation";

import ProgramAdminPage from "@/app/admin/program/page";
import { listProgramAreas } from "@/app/services/programAreaService";
import { isAdmin } from "@/app/services/userService";

jest.mock("../data/metadataDb/database");
jest.mock("../utils/auth-utils", () => ({
  isLoggedInUser: jest.fn().mockResolvedValue(true),
}));
jest.mock("../components/AuthSessionProvider", () => ({
  useIsLoggedInUser: () => true,
}));
jest.mock("../services/userService");
jest.mock("../services/programAreaService");
jest.mock("../services/listConditionsService", () => ({
  listConditionReferences: jest.fn().mockResolvedValue([]),
}));
describe("Program Admin Page", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should show 404 if not an admin", async () => {
    (isAdmin as unknown as jest.Mock).mockReturnValue(false);
    (listProgramAreas as jest.Mock).mockResolvedValue([]);

    render(await ProgramAdminPage());
    expect(notFound).toHaveBeenCalled();
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
    ]);

    const { container } = render(await ProgramAdminPage());
    expect(notFound).not.toHaveBeenCalled();
    expect(
      screen.queryByText("No program areas added"),
    ).not.toBeInTheDocument();
    expect(container).toMatchSnapshot();
  });
});
