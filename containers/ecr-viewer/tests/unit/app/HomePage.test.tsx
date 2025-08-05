import { render, screen } from "@testing-library/react";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { dbIsValid } from "@/app/api/migrate-db/migrate";
import { DEFAULT_ITEMS_PER_PAGE } from "@/app/constants";
import HomePage from "@/app/page";
import { getTotalEcrCount } from "@/app/services/listEcrDataService";
import { getLoggedInUser } from "@/app/services/loggedInUserService";
import { listLoggedInUserProgramAreas } from "@/app/services/userService";
import { returnParamDates } from "@/app/utils/date-utils";
import { PageSearchParams } from "@/app/utils/search-param-utils";

const resolveParams = (
  v: PageSearchParams,
): { searchParams: Promise<PageSearchParams> } => ({
  searchParams: new Promise((resolve) => resolve(v)),
});

jest.mock("@/app/services/listEcrDataService", () => {
  return {
    getTotalEcrCount: jest.fn().mockResolvedValue(0),
  };
});
jest.mock("@/app/data/metadataDb/database");
jest.mock("@/app/api/migrate-db/migrate");
jest.mock("@/app/services/listConditionsService");
jest.mock("@/app/services/loggedInUserService");
jest.mock("@/app/services/userService");
jest.mock("@/app/components/EcrFilters");
jest.mock("@/app/components/LibrarySearch");
jest.mock("@/app/utils/date-utils.ts");
jest.mock("next/headers", () => ({
  cookies: jest.fn().mockReturnValue({
    get: jest.fn(),
  }),
}));
jest.mock("@/app/components/AuthSessionProvider", () => ({
  useIsLoggedInUser: () => true,
}));
jest.mock("@/app/utils/auth-utils", () => ({
  getLoggedInUserSession: jest
    .fn()
    .mockResolvedValue({ email: "standard@standard.com" }),
}));

describe("Home Page", () => {
  beforeEach(() => {
    (dbIsValid as jest.Mock).mockResolvedValue(true);
  });
  afterEach(() => {
    process.env.METADATA_DATABASE_TYPE = "postgres";
    jest.clearAllMocks();
  });
  it("no metadata database, should not show the homepage", async () => {
    delete process.env.METADATA_DATABASE_TYPE;
    (getLoggedInUser as jest.Mock).mockResolvedValue({
      uuid: "1234",
      user_type: "admin",
    });
    render(await HomePage(resolveParams({})));
    expect(notFound).toHaveBeenCalled();
  });
  it("yes metadata database, should show the homepage", async () => {
    (getLoggedInUser as jest.Mock).mockResolvedValue({
      uuid: "1234",
      user_type: "admin",
    });
    render(await HomePage(resolveParams({})));
    expect(getTotalEcrCount).toHaveBeenCalledOnce();
    expect(notFound).not.toHaveBeenCalled();
  });
  it("yes metadata database, but not set up, should show error page", async () => {
    (dbIsValid as jest.Mock).mockResolvedValue(false);
    (getLoggedInUser as jest.Mock).mockResolvedValue({
      uuid: "1234",
      user_type: "admin",
    });
    render(await HomePage(resolveParams({})));
    expect(getTotalEcrCount).not.toHaveBeenCalled();
    expect(notFound).not.toHaveBeenCalled();
    expect(
      screen.getByText("eCR Viewer setup is incomplete"),
    ).toBeInTheDocument();
  });
  it("yes metadata database, no user, should not show the homepage", async () => {
    (getLoggedInUser as jest.Mock).mockResolvedValue(undefined);
    render(await HomePage(resolveParams({})));
    expect(notFound).toHaveBeenCalled();
  });
  it("yes metadata database, standard user with no program areas, should not show the homepage", async () => {
    (getLoggedInUser as jest.Mock).mockResolvedValue({
      uuid: "1234",
      user_type: "standard",
    });
    (listLoggedInUserProgramAreas as jest.Mock).mockResolvedValue([]);
    render(await HomePage(resolveParams({})));
    expect(getTotalEcrCount).not.toHaveBeenCalled();
    expect(notFound).not.toHaveBeenCalled();
    expect(
      screen.getByText("Your user setup is incomplete"),
    ).toBeInTheDocument();
  });
  it("yes metadata database, standard user with program areas, should show the homepage", async () => {
    (getLoggedInUser as jest.Mock).mockResolvedValue({
      uuid: "1234",
      user_type: "standard",
    });
    (listLoggedInUserProgramAreas as jest.Mock).mockResolvedValue([
      { uuid: "4567" },
    ]);
    render(await HomePage(resolveParams({})));
    expect(getTotalEcrCount).toHaveBeenCalledOnce();
    expect(notFound).not.toHaveBeenCalled();
  });
  it("yes metadata database, no user, but not set up, should show error page", async () => {
    (dbIsValid as jest.Mock).mockResolvedValue(false);
    (getLoggedInUser as jest.Mock).mockResolvedValue(undefined);
    render(await HomePage(resolveParams({})));
    expect(getTotalEcrCount).not.toHaveBeenCalled();
    expect(notFound).not.toHaveBeenCalled();
    expect(
      screen.getByText("eCR Viewer setup is incomplete"),
    ).toBeInTheDocument();
  });
});

describe("Reading query params on home page", () => {
  beforeEach(() => {
    (dbIsValid as jest.Mock).mockResolvedValue(true);
  });
  it("should call returnParamDates with the correct dateRange from query params", async () => {
    const mockDateRange = "last-7-days";
    const searchParams = { dateRange: mockDateRange };
    const mockReturnDates = {
      startDate: new Date("2024-12-01T00:00:00Z"),
      endDate: new Date("2024-12-07T23:59:59Z"),
    };

    (returnParamDates as jest.Mock).mockReturnValue(mockReturnDates);

    render(await HomePage(resolveParams(searchParams)));

    expect(returnParamDates).toHaveBeenCalledWith("last-7-days", "");
    expect(returnParamDates).toHaveReturnedWith(mockReturnDates);
  });
});

describe("Reading cookie for itemsPerPage", () => {
  it("should use default if no query param or cookie", async () => {
    render(await HomePage(resolveParams({})));

    expect(
      screen.getByText(DEFAULT_ITEMS_PER_PAGE.toString()),
    ).toBeInTheDocument();
  });

  it("should use cookie before default", async () => {
    (cookies as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue({ value: "2312" }),
    });

    render(await HomePage(resolveParams({})));

    expect(screen.getByText("2312")).toBeInTheDocument();
  });

  it("should use query param if set", async () => {
    const itemsPerPage = "432190";
    (cookies as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue({ value: "2312" }),
    });

    render(await HomePage(resolveParams({ itemsPerPage })));

    expect(screen.getByText("432190")).toBeInTheDocument();
  });
});
