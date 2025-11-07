/**
 * @jest-environment node
 */
import { Bundle } from "fhir/r4";

import { createFakeZip } from "../../../helpers";
import { saveToStorage } from "@/app/api/save-fhir-data/service";
import { saveToAzure } from "@/app/data/blobStorage/azureClient";
import { saveToGCP } from "@/app/data/blobStorage/gcpClient";
import { saveToS3 } from "@/app/data/blobStorage/s3Client";

jest.mock("@/app/data/blobStorage/azureClient");
jest.mock("@/app/data/blobStorage/gcpClient");
jest.mock("@/app/data/blobStorage/s3Client");
jest.mock("@/app/data/metadataDb/database");

describe("saveFhirData", () => {
  const fhirBundle: Bundle = { resourceType: "Bundle", type: "batch" };
  const ecrId = "1234";
  const xmlString = "<ClinicalDocument>Fake ECR XML</ClinicalDocument>";

  const mockZip = createFakeZip(xmlString)

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.ECR_BUCKET_NAME = "";
  });

  it("should call s3 when given a fhir bundle", async () => {
    process.env.ECR_BUCKET_NAME = "bucket";

    await saveToStorage(fhirBundle, ecrId, "s3", "fhir");
    expect(saveToS3).toHaveBeenCalledOnce();
  });

  it("should call azure when given a fhir bundle", async () => {
    process.env.ECR_BUCKET_NAME = "bucket";

    await saveToStorage(fhirBundle, ecrId, "azure", "fhir");
    expect(saveToAzure).toHaveBeenCalledOnce();
  });

  it("should call gcp when given a fhir bundle", async () => {
    process.env.ECR_BUCKET_NAME = "bucket";

    await saveToStorage(fhirBundle, ecrId, "gcp", "fhir");
    expect(saveToGCP).toHaveBeenCalledOnce();
  });

  it("should call s3 when given a zip", async () => {
    process.env.ECR_BUCKET_NAME = "bucket";

    await saveToStorage(mockZip, ecrId, "s3", "xml");
    expect(saveToS3).toHaveBeenCalledOnce();
  });

  it("should call azure when given a zip", async () => {
    process.env.ECR_BUCKET_NAME = "bucket";

    await saveToStorage(mockZip, ecrId, "azure", "xml");
    expect(saveToAzure).toHaveBeenCalledOnce();
  });

  it("should call gcp when given a zip", async () => {
    process.env.ECR_BUCKET_NAME = "bucket";

    await saveToStorage(mockZip, ecrId, "gcp", "xml");
    expect(saveToGCP).toHaveBeenCalledOnce();
  });

  it("should return an error for an invalid save source", async () => {
    const result = await saveToStorage(
      fhirBundle,
      ecrId,
      "invalid-source",
      "fhir",
    );

    expect(result).toEqual({
      message:
        'Invalid save source. Please provide a valid value for \'saveSource\' ("s3", "azure", or "gcp").',
      status: 400,
    });
  });
});
