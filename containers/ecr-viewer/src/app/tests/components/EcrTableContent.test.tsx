import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import router from "next-router-mock";

import EcrTableContent from "@/app/components/EcrTableContent";
import { EcrDisplay, listEcrData } from "@/app/services/listEcrDataService";
import { range } from "@/app/utils/data-utils";

jest.mock("../../services/listEcrDataService");
jest.mock("../../../app/api/services/database");

jest.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => router.pathname,
  useSearchParams: () => new URLSearchParams(router.asPath.split("?")[1] || ""),
}));

describe("EcrTableContent", () => {
  const mockedListEcrData = jest.mocked(listEcrData);
  const mockData: EcrDisplay[] = Array.from({ length: 25 }, (_, i) => ({
    ecrId: `id-${i + 1}`,
    patient_first_name: `first-${i + 1}`,
    patient_last_name: `last-${i + 1}`,
    dateModified: `2021-01-0${(i % 9) + 1}`,
    patient_date_of_birth: `2000-01-0${(i % 9) + 1}`,
    reportable_conditions: [
      `reportable-condition-${i + 1}`,
      `second-condition-${i + 1}`,
    ],
    rule_summaries: [`rule-summary-${i + 1}`, `second-summary-${i + 1}`],
    patient_report_date: i === 0 ? "" : `2021-01-0${(i % 9) + 1}`,
    date_created: `2021-01-0${(i % 9) + 1}`,
    eicr_set_id: `123${i}`,
    eicr_version_number: i === 0 ? undefined : `${i}`,
    related_ecrs: range(7).map((j) => ({
      eicr_id: `id-rel-${i + 1}-${j}`,
      set_id: `123${i}`,
      eicr_version_number: `${i - j - 1}`,
      date_created: new Date(`2021-01-0${((i + j) % 9) + 1}`),
    })),
  }));
  const mockDateRange = {
    startDate: new Date("12-01-2024"),
    endDate: new Date("12-02-2024"),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    router.setCurrentUrl(
      "/?itemsPerPage=25&columnId=report_date&direction=ASC&page=1",
    );
  });

  describe("load with an eCR", () => {
    it("should match snapshot", async () => {
      const user = userEvent.setup();
      mockedListEcrData.mockResolvedValue(mockData);
      const table = document.createElement("table");
      table.setAttribute("role", "treegrid");
      const { container } = render(
        await EcrTableContent({
          currentPage: 1,
          itemsPerPage: 25,
          totalEcrCount: mockData.length,
          sortColumn: "date_created",
          sortDirection: "DESC",
          filterDates: mockDateRange,
        }),
        {
          container: document.body.appendChild(table),
        },
      );
      expect(container).toMatchSnapshot();

      // expand an ecr row
      const expandEcrButton = screen.getAllByRole("button", {
        name: "View Related eCRs",
      });
      await user.click(expandEcrButton[0]);
      expect(container).toMatchSnapshot();

      // expand the show more
      const showMoreEcr = screen.getByRole("button", {
        name: "Show 2 more eCRs",
      });
      await user.click(showMoreEcr);
      expect(container).toMatchSnapshot();
    });

    it("should pass accessibility", async () => {
      const user = userEvent.setup();
      mockedListEcrData.mockResolvedValue(mockData);
      const table = document.createElement("table");
      table.setAttribute("role", "treegrid");
      const { container } = render(
        await EcrTableContent({
          currentPage: 1,
          itemsPerPage: 25,
          totalEcrCount: mockData.length,
          sortColumn: "date_created",
          sortDirection: "DESC",
          filterDates: mockDateRange,
        }),
        {
          container: document.body.appendChild(table),
        },
      );
      await act(async () => {
        expect(await axe(container)).toHaveNoViolations();
      });

      // expand an ecr row
      const expandEcrButton = screen.getAllByRole("button", {
        name: "View Related eCRs",
      });
      await user.click(expandEcrButton[0]);

      await act(async () => {
        expect(await axe(container)).toHaveNoViolations();
      });

      // expand the show more
      const showMoreEcr = screen.getByRole("button", {
        name: "Show 2 more eCRs",
      });
      await user.click(showMoreEcr);

      await act(async () => {
        expect(await axe(container)).toHaveNoViolations();
      });
    });
  });

  it("should call listEcrDataService with all params", async () => {
    mockedListEcrData.mockResolvedValue(mockData);

    const table = document.createElement("table");
    table.setAttribute("role", "treegrid");
    render(
      await EcrTableContent({
        currentPage: 1,
        itemsPerPage: 25,
        totalEcrCount: mockData.length,
        sortColumn: "date_created",
        sortDirection: "DESC",
        filterDates: mockDateRange,
        searchTerm: "blah",
        filterConditions: ["Anthrax (disorder)"],
      }),
      {
        container: document.body.appendChild(table),
      },
    );

    expect(mockedListEcrData).toHaveBeenCalledTimes(1);
    expect(mockedListEcrData).toHaveBeenCalledWith(
      0,
      25,
      "date_created",
      "DESC",
      mockDateRange,
      "blah",
      ["Anthrax (disorder)"],
    );
  });
});
