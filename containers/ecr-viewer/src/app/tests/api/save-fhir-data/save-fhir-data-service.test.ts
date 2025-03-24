import { Bundle } from "fhir/r4";

import { saveFhirData } from "@/app/api/save-fhir-data/save-fhir-data-service";
import { azureBlobContainerClient } from "@/app/data/blobStorage/azureClient";
import { gcpClient } from "@/app/data/blobStorage/gcpClient";
import { s3Client } from "@/app/data/blobStorage/s3Client";

jest.mock("../../../../app/data/blobStorage/azureClient", () => ({
  azureBlobContainerClient: jest.fn(),
}));
jest.mock("../../../../app/data/blobStorage/gcpClient", () => ({
  gcpClient: jest.fn(),
}));
jest.mock("../../../../app/data/blobStorage/s3Client", () => ({
  s3Client: { send: jest.fn() },
}));
jest.mock("@aws-sdk/client-s3", () => ({
  PutObjectCommand: jest.fn().mockImplementation((input) => ({
    input,
  })),
}));

describe("saveFhirData", () => {
  const fhirBundle: Bundle = { resourceType: "Bundle", type: "batch" };
  const fhirBundleString = JSON.stringify(fhirBundle);
  const ecrId = "1234";
  const ecrFileName = `${ecrId}.json`;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.ECR_BUCKET_NAME = "";
  });

  it("should return 200 when saving to s3 succeeds", async () => {
    process.env.ECR_BUCKET_NAME = "bucket";
    (s3Client.send as jest.Mock).mockResolvedValue({
      $metadata: { httpStatusCode: 200 },
    });

    const result = await saveFhirData(fhirBundle, ecrId, "s3");

    expect(result).toEqual({
      message: "Success. Saved FHIR bundle.",
      status: 200,
    });
    expect(s3Client.send).toHaveBeenCalledOnce();
    expect(s3Client.send).toHaveBeenCalledWith({
      input: {
        Body: fhirBundleString,
        Bucket: "bucket",
        Key: ecrFileName,
        ContentType: "application/json",
      },
    });
  });

  it("should return 500 when saving to s3 fails", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    (s3Client.send as jest.Mock).mockResolvedValue({
      $metadata: { httpStatusCode: 500 },
    });

    const result = await saveFhirData(fhirBundle, ecrId, "s3");

    expect(result).toEqual({
      message: "Failed to save FHIR bundle.",
      status: 500,
    });
  });

  it("should return 200 when saving to Azure succeeds", async () => {
    const mockUpload = jest
      .fn()
      .mockResolvedValue({ _response: { status: 201 } });
    const mockBlockBlobClient = jest.fn().mockReturnValue({
      upload: mockUpload,
    });
    (azureBlobContainerClient as jest.Mock).mockReturnValue({
      getBlockBlobClient: mockBlockBlobClient,
    });

    const result = await saveFhirData(fhirBundle, ecrId, "azure");

    expect(result).toEqual({
      message: "Success. Saved FHIR bundle.",
      status: 200,
    });
    expect(mockBlockBlobClient).toHaveBeenCalledExactlyOnceWith(ecrFileName);
    expect(mockUpload).toHaveBeenCalledOnce();
    expect(mockUpload).toHaveBeenCalledWith(
      fhirBundleString,
      fhirBundleString.length,
      {
        blobHTTPHeaders: { blobContentType: "application/json" },
      },
    );
  });

  it("should return 500 when saving to Azure succeeds", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    const mockUpload = jest
      .fn()
      .mockResolvedValue({ _response: { status: 500 } });
    const mockBlockBlobClient = jest.fn().mockReturnValue({
      upload: mockUpload,
    });
    (azureBlobContainerClient as jest.Mock).mockReturnValue({
      getBlockBlobClient: mockBlockBlobClient,
    });

    const result = await saveFhirData(fhirBundle, ecrId, "azure");

    expect(result).toEqual({
      message: "Failed to save FHIR bundle.",
      status: 500,
    });
  });

  it("should return 200 when saving to GCP succeeds", async () => {
    const mockSave = jest.fn().mockResolvedValue(undefined);
    const mockFile = jest.fn().mockReturnValue({ save: mockSave });
    (gcpClient as jest.Mock).mockReturnValue({
      file: mockFile,
    });

    const result = await saveFhirData(fhirBundle, ecrId, "gcp");

    expect(result).toEqual({
      message: "Success. Saved FHIR bundle.",
      status: 200,
    });
    expect(gcpClient).toHaveBeenCalledOnce();
    expect(mockFile).toHaveBeenCalledExactlyOnceWith(ecrFileName);
    expect(mockSave).toHaveBeenCalledExactlyOnceWith(fhirBundleString);
  });

  it("should return 500 when saving to GCP fails", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    const mockSave = jest.fn().mockRejectedValue(new Error("Failed to save"));
    const mockFile = jest.fn().mockReturnValue({ save: mockSave });
    (gcpClient as jest.Mock).mockReturnValue({
      file: mockFile,
    });

    const result = await saveFhirData(fhirBundle, ecrId, "gcp");

    expect(result).toEqual({
      message: "Failed to save FHIR bundle.",
      status: 500,
    });
  });

  it("should return 500 when GCP is not configured", async () => {
    (gcpClient as jest.Mock).mockReturnValue(undefined);

    const result = await saveFhirData(fhirBundle, ecrId, "gcp");

    expect(result).toEqual({
      message: "Failed to save the FHIR bundle due to misconfiguration.",
      status: 500,
    });
  });

  it("should return an error for an invalid save source", async () => {
    const result = await saveFhirData(fhirBundle, ecrId, "invalid-source");

    expect(result).toEqual({
      message:
        'Invalid save source. Please provide a valid value for \'saveSource\' ("s3", "azure", or "gcp").',
      status: 400,
    });
  });
});
