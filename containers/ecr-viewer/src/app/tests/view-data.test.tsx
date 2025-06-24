import React from "react";

import { render, screen } from "@testing-library/react";
import { notFound } from "next/navigation";

import BundleEcrMetadata from "../../../../../test-data/fhir/BundleEcrMetadata.json";
import { getFhirData, isSuccessResponse } from "@/app/services/fhirDataService";
import { isLoggedInUserEcrAuthed } from "@/app/services/userService";
import { getLoggedInUserSession } from "@/app/utils/auth-utils";
import ECRViewerPage from "@/app/view-data/page";

jest.mock("../data/metadataDb/database");
jest.mock("../view-data/components/LoadingComponent", () => ({
  EcrLoadingSkeleton: () => <div>Loading...</div>,
}));

jest.mock("../services/fhirDataService", () => ({
  getFhirData: jest.fn(),
  isSuccessResponse: jest.fn(),
}));

jest.mock("../components/AuthSessionProvider", () => ({
  useIsLoggedInUser: () => true,
}));

// Will return falsey for all the main tests, which implies NBS auth got them to the page
jest.mock("../utils/auth-utils", () => ({
  getLoggedInUserSession: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../services/userService");

jest.mock("../view-data/components/SideNav");

describe("ECRViewerPage", () => {
  const ORIG_BASE_PATH = process.env.BASE_PATH;
  beforeAll(() => {
    process.env.BASE_PATH = "ecr-viewer";
  });
  afterAll(() => {
    process.env.BASE_PATH = ORIG_BASE_PATH;
    jest.resetAllMocks();
  });

  it("should handle 404 error", async () => {
    (getFhirData as jest.Mock).mockResolvedValue({
      status: 404,
      payload: { message: "not found" },
    });
    (isSuccessResponse as unknown as jest.Mock).mockReturnValue(false);

    const component = await ECRViewerPage({ searchParams: { id: "123" } });
    render(component);

    expect(await screen.findByText("eCR retrieval failed")).toBeInTheDocument();
  });

  it("should handle 500 error", async () => {
    (getFhirData as jest.Mock).mockResolvedValue({
      status: 500,
      payload: { message: "uh oh something went wrong" },
    });
    (isSuccessResponse as unknown as jest.Mock).mockReturnValue(false);

    const component = await ECRViewerPage({ searchParams: { id: "123" } });
    render(component);

    expect(
      await screen.findByText("Something went wrong!"),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("500: uh oh something went wrong"),
    ).toBeInTheDocument();
  });

  it("should handle valid response", async () => {
    (getFhirData as jest.Mock).mockResolvedValue({
      status: 200,
      payload: { fhirBundle: BundleEcrMetadata },
    });
    (isSuccessResponse as unknown as jest.Mock).mockReturnValue(true);

    const component = await ECRViewerPage({ searchParams: { id: "123" } });
    render(component);

    expect(await screen.findByText("eCR Document")).toBeInTheDocument();
  });

  describe("auth", () => {
    beforeEach(() => {
      (getFhirData as jest.Mock).mockResolvedValue({
        status: 200,
        payload: { fhirBundle: BundleEcrMetadata },
      });
      (isSuccessResponse as unknown as jest.Mock).mockReturnValue(true);
    });

    afterEach(() => jest.resetAllMocks());

    it("should 404 if user not an authorized user", async () => {
      (getLoggedInUserSession as jest.Mock).mockResolvedValue({
        email: "hi@there.com",
      });
      (isLoggedInUserEcrAuthed as jest.Mock).mockResolvedValue(false);

      const component = await ECRViewerPage({ searchParams: { id: "123" } });
      render(component);

      expect(notFound).toHaveBeenCalled();
    });

    it("should render if user is authorized user", async () => {
      (getLoggedInUserSession as jest.Mock).mockResolvedValue({
        email: "hi@there.com",
      });
      (isLoggedInUserEcrAuthed as jest.Mock).mockResolvedValue(true);

      const component = await ECRViewerPage({ searchParams: { id: "123" } });
      render(component);

      expect(notFound).not.toHaveBeenCalled();
    });
  });
});
