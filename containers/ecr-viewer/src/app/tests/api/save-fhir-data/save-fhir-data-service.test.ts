import { Bundle } from "fhir/r4";

import { saveFhirData } from "@/app/api/save-fhir-data/save-fhir-data-service";
import { gcsClient } from "@/app/data/blobStorage/gcsClient";

jest.mock("../../../../app/data/blobStorage/azureClient", () => ({
  azureBlobContainerClient: jest.fn(),
}));

jest.mock("../../../../app/data/blobStorage/gcsClient", () => ({
  gcsClient: jest.fn(),
}));

describe("saveFhirData", () => {
  const fhirBundle: Bundle = { resourceType: "Bundle", type: "batch" };
  const ecrId = "1234";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 200 when saving to GCS succeeds", async () => {
    const mockSave = jest.fn().mockResolvedValue(undefined);
    const mockFile = jest.fn().mockReturnValue({ save: mockSave });
    (gcsClient as jest.Mock).mockReturnValue({
      file: mockFile,
    });
    const result = await saveFhirData(fhirBundle, ecrId, "gcs");

    expect(result).toEqual({
      message: "Success. Saved FHIR bundle.",
      status: 200,
    });
    expect(gcsClient).toHaveBeenCalledOnce();
    expect(mockFile).toHaveBeenCalledExactlyOnceWith(`${ecrId}.json`);
    expect(mockSave).toHaveBeenCalledExactlyOnceWith(
      JSON.stringify(fhirBundle),
    );
  });

  it("should return 500 when saving to GCS fails", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    const mockSave = jest.fn().mockRejectedValue(new Error("Failed to save"));
    const mockFile = jest.fn().mockReturnValue({ save: mockSave });
    (gcsClient as jest.Mock).mockReturnValue({
      file: mockFile,
    });
    const result = await saveFhirData(fhirBundle, ecrId, "gcs");

    expect(result).toEqual({
      message: "Failed to save FHIR bundle.",
      status: 500,
    });
    expect(gcsClient).toHaveBeenCalledOnce();
    expect(mockFile).toHaveBeenCalledExactlyOnceWith(`${ecrId}.json`);
    expect(mockSave).toHaveBeenCalledExactlyOnceWith(
      JSON.stringify(fhirBundle),
    );
  });

  it("should return an error for an invalid save source", async () => {
    const result = await saveFhirData(fhirBundle, ecrId, "invalid-source");

    expect(result).toEqual({
      message:
        'Invalid save source. Please provide a valid value for \'saveSource\' ("s3", or "azure").',
      status: 400,
    });
  });
});
