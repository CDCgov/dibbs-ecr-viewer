import React from "react";

import { render, screen } from "@testing-library/react";

import { get_fhir_data } from "@/app/api/fhir-data/fhir-data-service";
import ECRViewerPage from "@/app/view-data/page";

jest.mock("../view-data/component-utils", () => ({
  metrics: jest.fn(),
}));

jest.mock("../view-data/components/LoadingComponent", () => ({
  EcrLoadingSkeleton: () => <div>Loading...</div>,
}));

jest.mock("../api/fhir-data/fhir-data-service", () => ({
  get_fhir_data: jest.fn(),
}));
jest.mock("../components/AuthSessionProvider", () => ({
  useIsLoggedInUser: () => true,
}));

function mockFetch(
  fn: jest.Mock,
  data: any,
  status?: number,
  statusText?: string,
) {
  return fn.mockImplementation(() =>
    Promise.resolve({
      ok: status === 200 ? true : false,
      status,
      statusText,
      json: () => data,
    }),
  );
}

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
    mockFetch(get_fhir_data as jest.Mock, {}, 404);

    const component = await ECRViewerPage({ searchParams: { id: "123" } });
    render(component);

    expect(await screen.findByText("eCR retrieval failed"));
  });

  it("should handle 500 error", async () => {
    mockFetch(
      get_fhir_data as jest.Mock,
      {},
      500,
      "uh oh something went wrong",
    );

    const component = await ECRViewerPage({ searchParams: { id: "123" } });
    render(component);

    expect(await screen.findByText("Something went wrong!"));
    expect(await screen.findByText("500: uh oh something went wrong"));
  });

  it("should handle invalid response", async () => {
    mockFetch(get_fhir_data as jest.Mock, null, 200);

    const component = await ECRViewerPage({ searchParams: { id: "123" } });
    render(component);

    expect(
      await screen.findByText(
        "500: TypeError: Cannot read properties of null (reading 'fhirBundle')",
      ),
    );
  });
});
