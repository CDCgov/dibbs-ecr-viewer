import { axe } from "jest-axe";
import { act, render } from "@testing-library/react";
import EcrTable from "@/app/components/EcrTable";
import { EcrDisplay, listEcrData } from "@/app/services/listEcrDataService";
import router from "next-router-mock";
import { EcrTableLoading } from "@/app/components/EcrTableClient";

jest.mock("../../services/listEcrDataService");

jest.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => router.pathname,
  useSearchParams: () => new URLSearchParams(router.asPath.split("?")[1] || ""),
}));

describe("EcrTable", () => {
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
    patient_report_date: i == 0 ? "" : `2021-01-0${(i % 9) + 1}`,
    date_created: `2021-01-0${(i % 9) + 1}`,
    eicr_set_id: `123${i}`,
    eicr_version_number: i == 0 ? undefined : `${i}`,
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

  it("should match snapshot", async () => {
    mockedListEcrData.mockResolvedValue(mockData);
    const { container } = render(
      await EcrTable({
        currentPage: 1,
        itemsPerPage: 25,
        sortColumn: "date_created",
        sortDirection: "DESC",
        filterDates: mockDateRange,
      }),
    );
    expect(container).toMatchSnapshot();
  });

  it("should pass accessibility", async () => {
    mockedListEcrData.mockResolvedValue(mockData);
    const { container } = render(
      await EcrTable({
        currentPage: 1,
        itemsPerPage: 25,
        sortColumn: "date_created",
        sortDirection: "DESC",
        filterDates: mockDateRange,
      }),
    );
    await act(async () => {
      expect(await axe(container)).toHaveNoViolations();
    });
  });

  it("should call listEcrDataService with all params", async () => {
    mockedListEcrData.mockResolvedValue(mockData);

    render(
      await EcrTable({
        currentPage: 1,
        itemsPerPage: 25,
        sortColumn: "date_created",
        sortDirection: "DESC",
        filterDates: mockDateRange,
        searchTerm: "blah",
        filterConditions: ["Anthrax (disorder)"],
      }),
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

  describe("Snapshot test for EcrTableLoading", () => {
    let container: HTMLElement;

    beforeAll(() => {
      const mockIntersectionObserver = jest.fn();
      mockIntersectionObserver.mockReturnValue({
        observe: () => null,
        unobserve: () => null,
        disconnect: () => null,
      });
      window.IntersectionObserver = mockIntersectionObserver;

      container = render(<EcrTableLoading />).container;
    });
    it("should match snapshot", () => {
      expect(container).toMatchSnapshot();
    });
    it("should pass accessibility test", async () => {
      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
