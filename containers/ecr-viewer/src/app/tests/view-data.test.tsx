import React from "react";
import { render, screen } from "@testing-library/react";
import ECRViewerPage from "../view-data/page";
import { get_fhir_data } from "../api/fhir-data/fhir-data-service";

jest.mock("../view-data/component-utils", () => ({
  metrics: jest.fn(),
}));

jest.mock("../view-data/components/LoadingComponent", () => ({
  EcrLoadingSkeleton: () => <div>Loading...</div>,
}));

jest.mock("../api/fhir-data/fhir-data-service", () => ({
  get_fhir_data: jest.fn(),
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
      status: status,
      statusText: statusText,
      json: () => data,
    }),
  );
}

describe("ECRViewerPage", () => {
  beforeAll(() => {
    process.env.BASE_PATH = "ecr-viewer";
  });
  afterAll(() => {
    delete process.env.BASE_PATH;
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
