import { render, screen } from "@testing-library/react";
import { cookies } from "next/headers";

import { DEFAULT_ITEMS_PER_PAGE } from "@/app/constants";
import HomePage from "@/app/page";
import { getTotalEcrCount } from "@/app/services/listEcrDataService";
import { returnParamDates } from "@/app/utils/date-utils";

jest.mock("../services/listEcrDataService", () => {
  return {
    getTotalEcrCount: jest.fn().mockResolvedValue(0),
  };
});
jest.mock("../data/conditions");
jest.mock("../components/Filters");
jest.mock("../components/LibrarySearch");
jest.mock("../utils/date-utils.ts");
jest.mock("next/headers", () => ({
  cookies: jest.fn().mockReturnValue({
    get: jest.fn(),
  }),
}));

describe("Home Page", () => {
  afterEach(() => {
    process.env.NEXT_PUBLIC_NON_INTEGRATED_VIEWER = "false";
    jest.clearAllMocks();
  });
  it("env false value, should not show the homepage", async () => {
    process.env.NEXT_PUBLIC_NON_INTEGRATED_VIEWER = "false";
    render(await HomePage({ searchParams: {} }));
    expect(screen.getByText("Page not found")).toBeInTheDocument();
  });
  it("env invalid value, should not show the homepage", async () => {
    // @ts-ignore
    process.env.NEXT_PUBLIC_NON_INTEGRATED_VIEWER = "foo";
    render(await HomePage({ searchParams: {} }));
    expect(screen.getByText("Page not found")).toBeInTheDocument();
  });
  it("env no value, should not show the homepage", async () => {
    render(await HomePage({ searchParams: {} }));
    expect(screen.getByText("Page not found")).toBeInTheDocument();
  });
  it("env true value, should show the homepage", async () => {
    process.env.NEXT_PUBLIC_NON_INTEGRATED_VIEWER = "true";
    render(await HomePage({ searchParams: {} }));
    expect(getTotalEcrCount).toHaveBeenCalledOnce();
    expect(screen.queryByText("Page not found")).not.toBeInTheDocument();
  });
});

describe("Reading query params on home page", () => {
  it("should call returnParamDates with the correct dateRange from query params", async () => {
    process.env.NEXT_PUBLIC_NON_INTEGRATED_VIEWER = "true";
    const mockDateRange = "last-7-days";
    const searchParams = { dateRange: mockDateRange };
    const mockReturnDates = {
      startDate: new Date("2024-12-01T00:00:00Z"),
      endDate: new Date("2024-12-07T23:59:59Z"),
    };

    (returnParamDates as jest.Mock).mockReturnValue(mockReturnDates);

    render(await HomePage({ searchParams }));

    expect(returnParamDates).toHaveBeenCalledWith("last-7-days", "");
    expect(returnParamDates).toHaveReturnedWith(mockReturnDates);
  });
});

describe("Reading cookie for itemsPerPage", () => {
  it("should use default if no query param or cookie", async () => {
    process.env.NEXT_PUBLIC_NON_INTEGRATED_VIEWER = "true";

    render(await HomePage({ searchParams: {} }));

    expect(
      screen.getByText(DEFAULT_ITEMS_PER_PAGE.toString()),
    ).toBeInTheDocument();
  });

  it("should use cookie before default", async () => {
    process.env.NEXT_PUBLIC_NON_INTEGRATED_VIEWER = "true";
    (cookies as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue({ value: "2312" }),
    });

    render(await HomePage({ searchParams: {} }));

    expect(screen.getByText("2312")).toBeInTheDocument();
  });

  it("should use query param if set", async () => {
    process.env.NEXT_PUBLIC_NON_INTEGRATED_VIEWER = "true";
    const itemsPerPage = "432190";
    (cookies as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue({ value: "2312" }),
    });

    render(await HomePage({ searchParams: { itemsPerPage } }));

    expect(screen.getByText("432190")).toBeInTheDocument();
  });
});
