import { render, screen } from "@testing-library/react";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { DEFAULT_ITEMS_PER_PAGE } from "@/app/constants";
import HomePage from "@/app/page";
import { getTotalEcrCount } from "@/app/services/listEcrDataService";
import { returnParamDates } from "@/app/utils/date-utils";

jest.mock("../services/listEcrDataService", () => {
  return {
    getTotalEcrCount: jest.fn().mockResolvedValue(0),
  };
});
jest.mock("../../app/api/services/database");
jest.mock("../data/conditions");
jest.mock("../components/Filters");
jest.mock("../components/LibrarySearch");
jest.mock("../utils/date-utils.ts");
jest.mock("next/headers", () => ({
  cookies: jest.fn().mockReturnValue({
    get: jest.fn(),
  }),
}));
jest.mock("../components/AuthSessionProvider", () => ({
  useIsLoggedInUser: () => true,
}));
jest.mock("../utils/auth-utils", () => ({
  isLoggedInUser: jest.fn().mockResolvedValue(true),
}));

describe("Home Page", () => {
  afterEach(() => {
    process.env.METADATA_DATABASE_TYPE = "postgres";
    jest.clearAllMocks();
  });
  it("no metadata database, should not show the homepage", async () => {
    delete process.env.METADATA_DATABASE_TYPE;
    render(await HomePage({ searchParams: {} }));
    expect(notFound).toHaveBeenCalled();
  });
  it("yes metadata database, should show the homepage", async () => {
    render(await HomePage({ searchParams: {} }));
    expect(getTotalEcrCount).toHaveBeenCalledOnce();
    expect(notFound).not.toHaveBeenCalled();
  });
});

describe("Reading query params on home page", () => {
  it("should call returnParamDates with the correct dateRange from query params", async () => {
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
    render(await HomePage({ searchParams: {} }));

    expect(
      screen.getByText(DEFAULT_ITEMS_PER_PAGE.toString()),
    ).toBeInTheDocument();
  });

  it("should use cookie before default", async () => {
    (cookies as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue({ value: "2312" }),
    });

    render(await HomePage({ searchParams: {} }));

    expect(screen.getByText("2312")).toBeInTheDocument();
  });

  it("should use query param if set", async () => {
    const itemsPerPage = "432190";
    (cookies as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue({ value: "2312" }),
    });

    render(await HomePage({ searchParams: { itemsPerPage } }));

    expect(screen.getByText("432190")).toBeInTheDocument();
  });
});
