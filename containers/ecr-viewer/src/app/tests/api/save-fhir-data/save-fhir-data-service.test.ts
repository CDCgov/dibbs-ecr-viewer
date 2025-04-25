/**
 * @jest-environment node
 */
import { Bundle } from "fhir/r4";

import { saveFhirData } from "@/app/api/save-fhir-data/service";
import { saveToAzure } from "@/app/data/blobStorage/azureClient";
import { saveToGCP } from "@/app/data/blobStorage/gcpClient";
import { saveToS3 } from "@/app/data/blobStorage/s3Client";

jest.mock("../../../../app/data/blobStorage/azureClient");
jest.mock("../../../../app/data/blobStorage/gcpClient");
jest.mock("../../../../app/data/blobStorage/s3Client");
jest.mock("../../../../app/api/services/database");

describe("saveFhirData", () => {
  const fhirBundle: Bundle = { resourceType: "Bundle", type: "batch" };
  const ecrId = "1234";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.ECR_BUCKET_NAME = "";
  });

  it("should call s3", async () => {
    process.env.ECR_BUCKET_NAME = "bucket";

    await saveFhirData(fhirBundle, ecrId, "s3");
    expect(saveToS3).toHaveBeenCalledOnce();
  });

  it("should call azure", async () => {
    process.env.ECR_BUCKET_NAME = "bucket";

    await saveFhirData(fhirBundle, ecrId, "azure");
    expect(saveToAzure).toHaveBeenCalledOnce();
  });

  it("should call gcp", async () => {
    process.env.ECR_BUCKET_NAME = "bucket";

    await saveFhirData(fhirBundle, ecrId, "gcp");
    expect(saveToGCP).toHaveBeenCalledOnce();
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
