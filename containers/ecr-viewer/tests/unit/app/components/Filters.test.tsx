import React from "react";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter, useSearchParams } from "next/navigation";

import { NO_CONDITIONS_REPORTED_OPTION } from "@/app/constants";
import Filters from "@/app/components/EcrFilters";
import { DEFAULT_DATE_RANGE } from "@/app/utils/date-utils";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
  usePathname: jest.fn(() => "/test"),
  useSearchParams: jest.fn(),
}));

const MOCK_CONDITIONS = ["Condition1", "Condition2"];
const MOCK_PROPS = {
  allConditions: MOCK_CONDITIONS,
  initConditions: MOCK_CONDITIONS,
  initCustomDate: "",
  initDateRange: DEFAULT_DATE_RANGE,
};

function renderFilters(customConditions: string[] = MOCK_CONDITIONS) {
  const props = {
    ...MOCK_PROPS,
    allConditions: customConditions,
    initConditions: customConditions,
  };
  return render(<Filters {...props} />);
}

describe.each([
  {
    description: `only '${NO_CONDITIONS_REPORTED_OPTION}'`,
    conditions: [NO_CONDITIONS_REPORTED_OPTION],
    expectedElements: {
      noConditionsReported: true,
      regularConditions: false,
    },
  },
  {
    description: "only regular conditions",
    conditions: ["Condition1", "Condition2"],
    expectedElements: {
      noConditionsReported: false,
      regularConditions: true,
    },
  },
  {
    description: `'${NO_CONDITIONS_REPORTED_OPTION}' and conditions`,
    conditions: [NO_CONDITIONS_REPORTED_OPTION, "Condition1", "Condition2"],
    expectedElements: {
      noConditionsReported: true,
      regularConditions: true,
    },
  },
  {
    description: "no filterable conditions",
    conditions: [],
    expectedElements: {
      noConditionsReported: false,
      regularConditions: false,
    },
  },
])(
  "Filter by Reportable Conditions Component with $description",
  ({ conditions, description, expectedElements }) => {
    beforeEach(() => {
      jest.clearAllMocks();

      const conditionsParam =
        conditions.length > 0 ? `condition=${conditions.join("|")}` : "";
      const mockSearchParams = {
        current: new URLSearchParams(conditionsParam),
      };
      (useSearchParams as jest.Mock).mockImplementation(
        () => mockSearchParams.current,
      );

      const mockPush = jest.fn().mockImplementation((path: string) => {
        const url = new URL(path, "https://example.com");
        mockSearchParams.current = new URLSearchParams(url.search);
      });
      (useRouter as jest.Mock).mockImplementation(() => {
        return { push: mockPush };
      });

      global.fetch = jest.fn().mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(conditions),
        } as unknown as Response),
      );
    });

    it("renders correctly after opening conditions filter box", async () => {
      const user = userEvent.setup();
      const { container } = renderFilters(conditions);

      const toggleFilterButton = screen.getByRole("button", {
        name: /Filter by reportable condition/i,
      });
      await user.click(toggleFilterButton);

      expect(container).toMatchSnapshot();
    });

    it("Toggles filter by conditions combo box visibility", async () => {
      const user = userEvent.setup();
      renderFilters(conditions);
      const toggleButton = await screen.findByRole("button", {
        name: /Filter by reportable condition/i,
      });

      // Initially closed
      expect(screen.queryByText(/Filter by reportable condition/)).toBeNull();

      // Open on click
      await user.click(toggleButton);
      expect(
        screen.getByText(/Filter by reportable condition/),
      ).toBeInTheDocument();
      const applyFilterButton = screen.getByRole("button", {
        name: /Apply Filter/i,
      });
      expect(applyFilterButton).toBeInTheDocument();

      // Close on click
      await user.click(toggleButton);
      expect(screen.queryByText(/Filter by reportable condition/)).toBeNull();
    });

    it("Fetches conditions on Filters component mount", async () => {
      const user = userEvent.setup();
      renderFilters(conditions);
      const toggleButton = screen.getByRole("button", {
        name: /Filter by reportable condition/i,
      });

      await user.click(toggleButton);

      // Should have correct number of checkboxes
      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes).toHaveLength(conditions.length + 1); // conditions + select all

      // Conditions should be listed
      for (const condition of conditions) {
        expect(await screen.findByLabelText(condition)).toBeInTheDocument();
      }
    });

    it("updates filterConditions state when a checkbox is checked and unchecked", async () => {
      const user = userEvent.setup();
      renderFilters(conditions);
      const toggleFilterButton = screen.getByRole("button", {
        name: /Filter by reportable condition/i,
      });

      await user.click(toggleFilterButton);

      //--------- UNCHECKING BUTTON
      // Checkbox should initialize as checked
      if (expectedElements.regularConditions) {
        const checkbox = screen.getByLabelText("Condition1");
        expect(checkbox).toBeChecked();

        await user.click(checkbox);
        expect(checkbox).not.toBeChecked();

        // Applying filter and re-opening filter box should still filter out Condition1
        const toggleApplyButton = screen.getByRole("button", {
          name: /Apply filter/i,
        });
        await user.click(toggleApplyButton);

        await user.click(toggleFilterButton);
        expect(checkbox).not.toBeChecked();

        //--------- CHECKING BUTTON
        await user.click(checkbox);
        expect(checkbox).toBeChecked();

        // Applying filter and re-opening filter box should include Condition1 back to filter
        await user.click(toggleApplyButton);
        await user.click(toggleFilterButton);
        expect(checkbox).toBeChecked();
      }
    });

    if (expectedElements.regularConditions) {
      it("updates tag displaying number of conditions to filter on", async () => {
        const user = userEvent.setup();
        renderFilters();
        const toggleFilterButton = screen.getByRole("button", {
          name: /Filter by reportable condition/i,
        });
        await user.click(toggleFilterButton);
        const checkbox = screen.getByLabelText("Condition1");
        await user.click(checkbox);
        expect(checkbox).not.toBeChecked();
        // Tag should change to show "1" condition
        const tag = screen.getByTestId("filter-tag");
        expect(tag.textContent).toContain("1"); // TODO
        // Tag should revert to show "2" (all) conditions
        await user.click(checkbox);
        expect(checkbox).toBeChecked();
        expect(tag.textContent).toContain("2");
      });
    }
    if (expectedElements.regularConditions) {
      it("updates aria-label with number of conditions to filter on", async () => {
        const user = userEvent.setup();
        renderFilters(conditions);
        const toggleFilterButton = screen.getByRole("button", {
          name: /Filter by reportable condition/i,
        });
        await user.click(toggleFilterButton);

        const checkbox = screen.getByLabelText("Condition1");
        await user.click(checkbox);

        expect(toggleFilterButton.getAttribute("aria-label")).toBe(
          `Filter by reportable condition, ${conditions.length - 1} selected`,
        );

        await user.click(checkbox);
        expect(toggleFilterButton.getAttribute("aria-label")).toBe(
          "Filter by reportable condition",
        );
      });
    }

    if (
      expectedElements.noConditionsReported ||
      expectedElements.regularConditions
    ) {
      it("handles 'Select all' and 'Deselect all' checkbox behavior", async () => {
        const user = userEvent.setup();
        renderFilters(conditions);
        const toggleFilterButton = screen.getByRole("button", {
          name: /Filter by reportable condition/i,
        });
        await user.click(toggleFilterButton);

        // Click deselect all
        const deselectAll = await screen.findByLabelText("Deselect all");
        await user.click(deselectAll);

        // All checkboxes should be unchecked after "Deselect all" is clicked
        for (const condition of conditions) {
          const checkbox = screen.getByLabelText(condition);
          expect(checkbox).not.toBeChecked();
        }

        // Click select all
        const selectAll = await screen.findByLabelText("Select all");
        await user.click(selectAll);

        // All checkboxes should be checked after selecting all
        for (const condition of conditions) {
          const checkbox = screen.getByLabelText(condition);
          expect(checkbox).toBeChecked();
        }
      });
    }

    it("If a condition is checked but button is closed without applying filter, filters should reset", async () => {
      const user = userEvent.setup();
      renderFilters();
      const toggleFilterButton = screen.getByRole("button", {
        name: /Filter by reportable condition/i,
      });

      await user.click(toggleFilterButton);

      // Uncheck condition1 (tag becomes "1"), but user closes button before applying filter
      const checkbox = screen.getByLabelText("Condition1");
      await user.click(checkbox);
      expect(checkbox).not.toBeChecked();

      const tag = screen.getByTestId("filter-tag");
      expect(tag.textContent).toContain("1");

      await user.click(toggleFilterButton);

      // Opening button should reset to original state & reset tag back to "2"
      await user.click(toggleFilterButton);
      const checkboxAfterReset = screen.getByLabelText("Condition1");
      expect(checkboxAfterReset).toBeChecked();

      const tagAfterReset = screen.getByTestId("filter-tag");
      expect(tagAfterReset.textContent).toContain("2");
    });

    it("Query should persist over a reload", async () => {
      const user = userEvent.setup();
      const { rerender } = renderFilters();
      const toggleFilterButton = screen.getByRole("button", {
        name: /Filter by reportable condition/i,
      });

      await user.click(toggleFilterButton);

      const checkbox = screen.getByLabelText("Condition1");
      await user.click(checkbox);
      expect(checkbox).not.toBeChecked();

      const applyButton = screen.getByRole("button", { name: /Apply Filter/i });
      await user.click(applyButton);

      rerender(<Filters {...MOCK_PROPS} />);
      await user.click(toggleFilterButton);

      const checkboxAfterReload = screen.getByLabelText("Condition1");
      expect(checkboxAfterReload).not.toBeChecked();
    });

    it("navigates with the correct query string on applying filters", async () => {
      const user = userEvent.setup();
      const mockPush = jest.fn();
      (useRouter as jest.Mock).mockReturnValue({ push: mockPush });

      renderFilters();
      const toggleFilterButton = screen.getByRole("button", {
        name: /Filter by reportable condition/i,
      });
      await user.click(toggleFilterButton);

      const checkbox = screen.getByLabelText("Condition1");
      await user.click(checkbox);
      expect(checkbox).not.toBeChecked();

      const applyButton = screen.getByRole("button", { name: /Apply Filter/i });
      await user.click(applyButton);

      expect(toggleFilterButton).toHaveFocus();

      // Should have other condition in search param
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining("condition=Condition2"),
      );
    });
  },
);

describe("Filter by Date Component - custom dates", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("Renders correctly after opening Filter by Date box and clicking Custom date range option", async () => {
    const user = userEvent.setup();
    const mockDate = new Date("2025-01-09T13:00:00");
    jest
      .spyOn(global, "Date")
      .mockImplementation(() => mockDate as unknown as Date);

    const { container } = renderFilters();

    const toggleFilterButton = screen.getByRole("button", {
      name: /Filter by received date/i,
    });
    await user.click(toggleFilterButton);

    const radio = screen.getByRole("radio", {
      name: "Custom date range",
    });
    await user.click(radio);

    expect(container).toMatchSnapshot();
  });
  it("Display start and end date fields when 'Custom date range' is selected", async () => {
    const user = userEvent.setup();
    (useRouter as jest.Mock).mockReturnValue({ push: jest.fn() });

    renderFilters();
    const toggleButton = screen.getByRole("button", {
      name: /Filter by received date/i,
    });
    await user.click(toggleButton);

    const radio = screen.getByRole("radio", {
      name: "Custom date range",
    });
    await user.click(radio);

    expect(screen.getByText("Start date")).toBeInTheDocument();
    expect(screen.getByText("End date")).toBeInTheDocument();
  });
  it("Navigates with the correct query string on applying custom dates", async () => {
    const user = userEvent.setup();
    const mockPush = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });

    renderFilters();
    const toggleButton = screen.getByRole("button", {
      name: /Filter by received date/i,
    });
    await user.click(toggleButton);

    const radio = screen.getByRole("radio", {
      name: "Custom date range",
    });
    await user.click(radio);

    const startDateInput = screen.getByTestId("start-date");
    const endDateInput = screen.getByTestId("end-date");

    await user.type(startDateInput, "2025-01-01");
    await user.type(endDateInput, "2025-01-02");

    const applyButton = screen.getByRole("button", { name: /Apply filter/i });
    await user.click(applyButton);

    expect(toggleButton).toHaveFocus();

    // Filter by Date button title should include custom date range
    expect(
      screen.getByRole("button", {
        name: /Filter by received date/i,
      }),
    ).toHaveTextContent("From 01/01/2025 to 01/02/2025");

    // Should have custom date range in search param
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("dateRange=custom"),
    );
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("dates=2025-01-01%7C2025-01-02"),
    );
  });
  it("If no end date is given, end date defaults to today", async () => {
    const user = userEvent.setup();
    const mockDateString = "2025-01-09";
    const mockDate = new Date("2025-01-09T13:00:00");
    jest
      .spyOn(global, "Date")
      .mockImplementation(() => mockDate as unknown as Date);

    const mockPush = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });

    renderFilters();
    const toggleButton = screen.getByRole("button", {
      name: /Filter by received date/i,
    });
    await user.click(toggleButton);

    const radio = screen.getByRole("radio", {
      name: "Custom date range",
    });
    await user.click(radio);

    const startDateInput = screen.getByTestId("start-date");
    await user.type(startDateInput, "2025-01-01");

    const applyButton = screen.getByRole("button", {
      name: /Apply filter/i,
    });
    await user.click(applyButton);

    // Should have custom date range in search param
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("dateRange=custom"),
    );
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining(`dates=2025-01-01%7C${mockDateString}`),
    );
  });
});

describe("Filter Opening/Closing Controls", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    const mockSearchParams = { current: new URLSearchParams("") };
    (useSearchParams as jest.Mock).mockImplementation(
      () => mockSearchParams.current,
    );

    const mockPush = jest.fn().mockImplementation((path: string) => {
      const url = new URL(path, "https://example.com");
      mockSearchParams.current = new URLSearchParams(url.search);
    });
    (useRouter as jest.Mock).mockImplementation(() => {
      return { push: mockPush };
    });

    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(["Condition1", "Condition2"]),
      } as unknown as Response),
    );
  });

  it("If a date range is checked but escape is hit without applying filter, filters should reset", async () => {
    const user = userEvent.setup();
    renderFilters();
    const toggleButton = screen.getByRole("button", {
      name: /Filter by received date/i,
    });
    await user.click(toggleButton);

    // Click different date option, but user closes button before applying filter
    const radio = await screen.findByRole("radio", {
      name: "Last 7 days",
    });
    await user.click(radio);
    expect(radio).toBeChecked();

    await user.keyboard("[Escape]");

    // should be closed
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();

    // Selection should not persist because filter was not applied
    expect(screen.getByText("Last year")).toBeInTheDocument();

    // Focus should reset
    expect(toggleButton).toHaveFocus();

    // open and check reset
    await user.click(toggleButton);
    expect(
      screen.getByRole("radio", {
        name: "Last 7 days",
      }),
    ).not.toBeChecked();
  });

  it("If a date range is checked but outside click is hit without applying filter, filters should reset", async () => {
    const user = userEvent.setup();
    render(
      <div data-testid="outside">
        <Filters {...MOCK_PROPS} />
      </div>,
    );
    const toggleButton = screen.getByRole("button", {
      name: /Filter by received date/i,
    });

    await user.click(toggleButton);

    // Click different date option, but user closes button before applying filter
    const radio = await screen.findByRole("radio", {
      name: "Last 7 days",
    });
    await user.click(radio);
    expect(radio).toBeChecked();

    const outsideDiv = screen.getByTestId("outside");
    await user.click(outsideDiv);

    // should be closed
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();

    // Selection should not persist because filter was not applied
    expect(screen.getByText("Last year")).toBeInTheDocument();

    // open and check reset
    await user.click(toggleButton);

    expect(
      screen.getByRole("radio", {
        name: "Last 7 days",
      }),
    ).not.toBeChecked();
  });

  it("If a date range is checked but condition button is hit, date should reset and close", async () => {
    const user = userEvent.setup();
    renderFilters();
    const dateToggleButton = screen.getByRole("button", {
      name: /Filter by received date/i,
    });
    await user.click(dateToggleButton);

    // Click different date option, but user closes button before applying filter
    const radio = await screen.findByRole("radio", {
      name: "Last 7 days",
    });
    await user.click(radio);
    expect(radio).toBeChecked();

    const conditionToggleButton = screen.getByRole("button", {
      name: /Filter by reportable condition/i,
    });

    await user.click(conditionToggleButton);

    // date should be closed
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();

    // Selection should not persist because filter was not applied
    expect(screen.getByText("Last year")).toBeInTheDocument();

    // condition should be open
    expect(
      screen.getByText("Filter by reportable condition"),
    ).toBeInTheDocument();

    // open date and check reset
    await user.click(dateToggleButton);
    expect(
      screen.getByRole("radio", {
        name: "Last 7 days",
      }),
    ).not.toBeChecked();

    // condition should be closed
    expect(screen.queryByText("Select all")).not.toBeInTheDocument();
  });
});

describe("Reset button", () => {
  let mockPush: jest.Mock;
  const SearchParamContext = React.createContext({} as any);
  beforeEach(() => {
    jest.clearAllMocks();

    (useSearchParams as jest.Mock).mockImplementation(() => {
      const { searchParams } = React.useContext(SearchParamContext);
      return searchParams;
    });

    mockPush = jest.fn().mockImplementation((path: string, setSearchParams) => {
      const url = new URL(path, "https://example.com");
      setSearchParams(new URLSearchParams(url.search));
    });
    (useRouter as jest.Mock).mockImplementation(() => {
      const { setSearchParams } = React.useContext(SearchParamContext);
      return { push: (path: string) => mockPush(path, setSearchParams) };
    });

    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(["Condition1", "Condition2"]),
      } as unknown as Response),
    );
  });

  it("changes back to original defaults", async () => {
    const user = userEvent.setup();
    const SearchParamWrapper = ({
      children,
    }: {
      children: React.ReactNode;
    }) => {
      const [searchParams, setSearchParams] = React.useState(
        new URLSearchParams(""),
      );
      return (
        <SearchParamContext.Provider value={{ searchParams, setSearchParams }}>
          {children}
        </SearchParamContext.Provider>
      );
    };
    render(
      <SearchParamWrapper>
        <Filters {...MOCK_PROPS} />
      </SearchParamWrapper>,
    );

    // reset button not visible by default
    expect(
      screen.queryByRole("button", { name: /Reset filters to defaults/i }),
    ).not.toBeInTheDocument();

    const dateToggleButton = screen.getByRole("button", {
      name: /Filter by received date/i,
    });
    await user.click(dateToggleButton);

    // Click different date option and submit
    const radio = screen.getByRole("radio", {
      name: "Last 7 days",
    });
    await user.click(radio);
    expect(radio).toBeChecked();

    const applyButton = screen.getByRole("button", { name: /Apply filter/i });
    await user.click(applyButton);

    // should be closed
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();

    // Selection should persist because filter was applied
    expect(screen.getByText("Last 7 days")).toBeInTheDocument();

    // Should have other condition in search param
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("dateRange=last-7-days"),
      expect.anything(),
    );

    // reset button should be visible now that something has changed
    expect(
      screen.getByRole("button", { name: /Reset filters to defaults/i }),
    ).toBeInTheDocument();

    // Update condition selection
    const conditionToggleButton = screen.getByRole("button", {
      name: /Filter by reportable condition/i,
    });
    await user.click(conditionToggleButton);

    const checkbox = screen.getByLabelText("Condition1");
    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();

    // Submit form to update url
    await user.keyboard("[Enter]");

    // Should have other condition in search param
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("condition=Condition2"),
      expect.anything(),
    );

    const resetButton = screen.getByRole("button", {
      name: /Reset filters to defaults/i,
    });
    await user.click(resetButton);

    expect(mockPush).toHaveBeenCalledWith(
      expect.not.stringContaining("dateRange="),
      expect.anything(),
    );
    expect(mockPush).toHaveBeenCalledWith(
      expect.not.stringContaining("condition="),
      expect.anything(),
    );
  });
});
