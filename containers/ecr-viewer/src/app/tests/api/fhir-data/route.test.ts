/**
 * @jest-environment node
 */
import { GET } from "@/app/api/fhir-data/route";
import { get_fhir_data } from "@/app/api/fhir-data/fhir-data-service";
import { S3_SOURCE } from "@/app/api/utils";
import { NextRequest, NextResponse } from "next/server";

jest.mock("../../../api/fhir-data/fhir-data-service", () => ({
  get_fhir_data: jest.fn(),
}));

const emptyResponse = { fhirBundle: [], fhirPathMappings: [] };

describe("GET fhir-data", () => {
  afterEach(() => {
    process.env.SOURCE = S3_SOURCE;
    jest.resetAllMocks();
  });

  it("should defer to get_fhir_data service function", async () => {
    (get_fhir_data as jest.Mock).mockResolvedValue(
      NextResponse.json(emptyResponse, { status: 200 }),
    );

    const response = await GET(
      new NextRequest(new URL("https://example.com/api/fhir-data?id=123")),
    );

    expect(get_fhir_data).toHaveBeenCalledOnce();
    expect(response.status).toEqual(200);
    expect(await response.json()).toEqual(emptyResponse);
  });
});
