import React from "react";
import Filters from "@/app/components/Filters";
import { render, screen } from "@testing-library/react";
import { useRouter, useSearchParams } from "next/navigation";
import userEvent from "@testing-library/user-event";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
  usePathname: jest.fn(() => "/test"),
  useSearchParams: jest.fn(),
}));

const MOCK_CONDITIONS = ["Condition1", "Condition2"];

function renderFilters() {
  return render(<Filters conditions={MOCK_CONDITIONS} />);
}

describe("Filter by Reportable Conditions Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    const mockSearchParams = {
      current: new URLSearchParams("condition=Condition1|Condition2"),
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
        json: () => Promise.resolve(["Condition1", "Condition2"]),
      } as unknown as Response),
    );
  });

  it("renders correctly after opening conditions filter box", async () => {
    const user = userEvent.setup();
    const { container } = renderFilters();

    const toggleFilterButton = screen.getByRole("button", {
      name: /Filter by reportable condition/i,
    });
    await user.click(toggleFilterButton);

    expect(container).toMatchSnapshot();
  });

  it("Toggles filter by conditions combo box visibility", async () => {
    const user = userEvent.setup();
    renderFilters();
    const toggleButton = await screen.findByRole("button", {
      name: /Filter by reportable condition/i,
    });

    // Initially closed
    expect(screen.queryByText(/Filter by Reportable Condition/)).toBeNull();

    // Open on click
    await user.click(toggleButton);
    expect(
      screen.getByText(/Filter by Reportable Condition/),
    ).toBeInTheDocument();
    const applyFilterButton = screen.getByRole("button", {
      name: /Apply Filter/i,
    });
    expect(applyFilterButton).toBeInTheDocument();

    // Close on click
    await user.click(toggleButton);
    expect(screen.queryByText(/Filter by Reportable Condition/)).toBeNull();
  });

  it("Fetches conditions on Filters component mount", async () => {
    const user = userEvent.setup();
    renderFilters();
    const toggleButton = screen.getByRole("button", {
      name: /Filter by reportable condition/i,
    });

    await user.click(toggleButton);

    // Should have correct number of checkboxes
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(3); // 2 conditions + select all

    // Conditions should be listed
    expect(await screen.findByLabelText("Condition1")).toBeInTheDocument();
    expect(await screen.findByLabelText("Condition2")).toBeInTheDocument();
  });

  it("updates filterConditions state when a checkbox is checked and unchecked", async () => {
    const user = userEvent.setup();
    renderFilters();
    const toggleFilterButton = screen.getByRole("button", {
      name: /Filter by reportable condition/i,
    });

    await user.click(toggleFilterButton);

    //--------- UNCHECKING BUTTON
    // Checkbox should initialize as checked
    const checkbox = screen.getByLabelText("Condition1");
    expect(checkbox).toBeChecked();

    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();

    // Applying filter and re-opening filter box should still filter out Condition1
    const toggleApplyButton = screen.getByRole("button", {
      name: /Apply Filter/i,
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
  });

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
    expect(tag.textContent).toContain("1");

    // Tag should revert to show "2" (all) conditions
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(tag.textContent).toContain("2");
  });

  it("handles 'Select all' and 'Deselect all' checkbox behavior", async () => {
    const user = userEvent.setup();
    renderFilters();
    const toggleFilterButton = screen.getByRole("button", {
      name: /Filter by reportable condition/i,
    });
    await user.click(toggleFilterButton);

    // Click deselect all
    const deselectAll = await screen.findByLabelText("Deselect all");
    await user.click(deselectAll);

    // Both checkboxes should be unchecked after "Deselect all" is clicked
    const condition1Checkbox = screen.getByLabelText("Condition1");
    const condition2Checkbox = screen.getByLabelText("Condition2");
    expect(condition1Checkbox).not.toBeChecked();
    expect(condition2Checkbox).not.toBeChecked();

    // Click select all
    const selectAll = await screen.findByLabelText("Select all");
    await user.click(selectAll);

    // Both checkboxes should be checked after selecting all
    expect(condition1Checkbox).toBeChecked();
    expect(condition2Checkbox).toBeChecked();
  });

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

    rerender(<Filters conditions={MOCK_CONDITIONS} />);
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
});

describe("Filter by Date Component", () => {
  // NOTE: Tests look for Last Year = local dev default. The prod default is Last 24 hours.
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

  it("Renders correctly after opening Filter by Date box", async () => {
    const user = userEvent.setup();
    const { container } = renderFilters();

    const toggleFilterButton = await screen.findByRole("button", {
      name: /Filter by Received Date/i,
    });
    await user.click(toggleFilterButton);

    expect(container).toMatchSnapshot();
  });
  it("Toggles Filter by Date combo box visibility", async () => {
    const user = userEvent.setup();
    renderFilters();
    const toggleButton = await screen.findByRole("button", {
      name: /Filter by Received Date/i,
    });

    // Initially closed
    expect(screen.queryByText(/Filter by Received Date/)).toBeNull();
    expect(screen.queryByText(/Last year/)).toBeInTheDocument();

    // Open on click
    await user.click(toggleButton);
    expect(screen.getByText(/Filter by Received Date/)).toBeInTheDocument();
    const applyFilterButton = screen.getByRole("button", {
      name: /Apply Filter/i,
    });
    expect(applyFilterButton).toBeInTheDocument();

    // Close on click
    await user.click(toggleButton);
    expect(screen.queryByText(/Filter by Received Date/)).toBeNull();
  });
  it("Updates filter date range when selection is made", async () => {
    const user = userEvent.setup();
    const { rerender } = renderFilters();
    const toggleButton = screen.getByRole("button", {
      name: /Filter by Received Date/i,
    });
    await user.click(toggleButton);

    // Check default state is "Last year" (local dev default)
    const defaultRadio = screen.getByRole("radio", {
      name: "Last year",
    });
    expect(defaultRadio).toBeChecked();

    // Change selection to "Last 7 days"
    const radioLast7Days = screen.getByRole("radio", {
      name: "Last 7 days",
    });
    await user.click(radioLast7Days);

    const applyFilterButton = screen.getByRole("button", {
      name: /Apply Filter For Received Date/i,
    });
    await user.click(applyFilterButton);

    // Only one radio button can be checked at a time.
    await user.click(toggleButton);
    expect(radioLast7Days).toBeChecked();

    const defaultRadioAfter = screen.getByRole("radio", {
      name: "Last year",
    });
    expect(defaultRadioAfter).not.toBeChecked();

    // Filter by Date button should be titled "Last 7 days"
    expect(
      screen.getByRole("button", {
        name: /Filter by Received Date/i,
      }),
    ).toHaveTextContent("Last 7 days");

    // Query should persist over a reload
    rerender(<Filters conditions={MOCK_CONDITIONS} />);
    expect(
      screen.getByRole("button", {
        name: /Filter by Received Date/i,
      }),
    ).toHaveTextContent("Last 7 days");
  });
  it("Navigates with the correct query string on applying filters", async () => {
    const user = userEvent.setup();
    const mockPush = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });

    renderFilters();
    const toggleButton = screen.getByRole("button", {
      name: /Filter by Received Date/i,
    });
    await user.click(toggleButton);

    const radio = screen.getByRole("radio", {
      name: "Last 7 days",
    });
    await user.click(radio);
    expect(radio).toBeChecked();

    const applyButton = screen.getByRole("button", { name: /Apply Filter/i });
    await user.click(applyButton);

    expect(toggleButton).toHaveFocus();

    // Should have date range in search param
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("dateRange=last-7-days"),
    );
  });
  it("If a date range is checked but button is closed without applying filter, filters should reset", async () => {
    const user = userEvent.setup();
    renderFilters();
    const toggleButton = screen.getByRole("button", {
      name: /Filter by Received Date/i,
    });

    await user.click(toggleButton);

    // Click different date option, but user closes button before applying filter
    const radio = screen.getByRole("radio", {
      name: "Last 7 days",
    });
    await user.click(radio);
    expect(radio).toBeChecked();

    await user.click(toggleButton);

    // Selection should not persist because filter was not applied
    expect(screen.getByText("Last year")).toBeInTheDocument();
    await user.click(toggleButton);
    const radioAfterReset = screen.getByRole("radio", {
      name: "Last 7 days",
    });
    expect(radioAfterReset).not.toBeChecked();
  });
});

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
      name: /Filter by Received Date/i,
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
      name: /Filter by Received Date/i,
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
      name: /Filter by Received Date/i,
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

    const applyButton = screen.getByRole("button", { name: /Apply Filter/i });
    await user.click(applyButton);

    expect(toggleButton).toHaveFocus();

    // Filter by Date button title should include custom date range
    expect(
      screen.getByRole("button", {
        name: /Filter by Received Date/i,
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
      name: /Filter by Received Date/i,
    });
    await user.click(toggleButton);

    const radio = screen.getByRole("radio", {
      name: "Custom date range",
    });
    await user.click(radio);

    const startDateInput = screen.getByTestId("start-date");
    await user.type(startDateInput, "2025-01-01");

    const applyButton = screen.getByRole("button", {
      name: /Apply Filter/i,
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
      name: /Filter by Received Date/i,
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
        <Filters conditions={MOCK_CONDITIONS} />
      </div>,
    );
    const toggleButton = screen.getByRole("button", {
      name: /Filter by Received Date/i,
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
      name: /Filter by Received Date/i,
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

    // condtion should be open
    expect(
      screen.getByText("Filter by Reportable Condition"),
    ).toBeInTheDocument();

    // open date and check reset
    await user.click(dateToggleButton);
    expect(
      screen.getByRole("radio", {
        name: "Last 7 days",
      }),
    ).not.toBeChecked();

    // condtion should be closed
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
        <Filters conditions={MOCK_CONDITIONS} />
      </SearchParamWrapper>,
    );

    // reset button not visible by default
    expect(
      screen.queryByRole("button", { name: /Reset Filters to Defaults/i }),
    ).not.toBeInTheDocument();

    const dateToggleButton = screen.getByRole("button", {
      name: /Filter by Received Date/i,
    });
    await user.click(dateToggleButton);

    // Click different date option and submit
    const radio = screen.getByRole("radio", {
      name: "Last 7 days",
    });
    await user.click(radio);
    expect(radio).toBeChecked();

    const applyButton = screen.getByRole("button", { name: /Apply Filter/i });
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
      screen.getByRole("button", { name: /Reset Filters to Defaults/i }),
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
      name: /Reset Filters to Defaults/i,
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
    // default title
    expect(screen.getByText("Last year")).toBeInTheDocument();
    // not active
    expect(conditionToggleButton).toHaveClass("filter-button");
  });
});
