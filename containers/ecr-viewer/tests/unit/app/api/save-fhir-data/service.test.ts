/**
 * @jest-environment node
 */
import { Bundle } from "fhir/r4";

import { createFakeZip } from "../../../helpers";
import {
  deleteFromStorage,
  saveToStorage,
} from "@/app/api/save-fhir-data/service";
import {
  deleteFromAzure,
  saveToAzure,
} from "@/app/data/blobStorage/azureClient";
import { deleteFromGCP, saveToGCP } from "@/app/data/blobStorage/gcpClient";
import { deleteFromS3, saveToS3 } from "@/app/data/blobStorage/s3Client";

jest.mock("@/app/data/blobStorage/azureClient");
jest.mock("@/app/data/blobStorage/gcpClient");
jest.mock("@/app/data/blobStorage/s3Client");
jest.mock("@/app/data/metadataDb/database");

describe("Cloud save and delete", () => {
  describe("saveFhirData", () => {
    const fhirBundle: Bundle = { resourceType: "Bundle", type: "batch" };
    const ecrId = "1234";
    const xmlString = "<ClinicalDocument>Fake ECR XML</ClinicalDocument>";

    const mockZip = createFakeZip(xmlString);

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

  describe("deleteFromStorage", () => {
    const ecrId = "1234";

    beforeEach(() => {
      jest.clearAllMocks();
    });

    afterEach(() => {
      process.env.ECR_BUCKET_NAME = "";
    });

    it("should call S3 delete when deleting a FHIR bundle", async () => {
      await deleteFromStorage(ecrId, "s3", "fhir");
      expect(deleteFromS3).toHaveBeenCalledWith(`${ecrId}.json`);
      expect(deleteFromS3).toHaveBeenCalledTimes(1);
    });

    it("should call Azure delete when deleting a FHIR bundle", async () => {
      await deleteFromStorage(ecrId, "azure", "fhir");
      expect(deleteFromAzure).toHaveBeenCalledWith(`${ecrId}.json`);
      expect(deleteFromAzure).toHaveBeenCalledTimes(1);
    });

    it("should call GCP delete when deleting a FHIR bundle", async () => {
      await deleteFromStorage(ecrId, "gcp", "fhir");
      expect(deleteFromGCP).toHaveBeenCalledWith(`${ecrId}.json`);
      expect(deleteFromGCP).toHaveBeenCalledTimes(1);
    });

    it("should call S3 delete when deleting XML zip", async () => {
      await deleteFromStorage(ecrId, "s3", "xml");
      expect(deleteFromS3).toHaveBeenCalledWith(`${ecrId}.zip`);
      expect(deleteFromS3).toHaveBeenCalledTimes(1);
    });

    it("should call Azure delete when deleting XML zip", async () => {
      await deleteFromStorage(ecrId, "azure", "xml");
      expect(deleteFromAzure).toHaveBeenCalledWith(`${ecrId}.zip`);
      expect(deleteFromAzure).toHaveBeenCalledTimes(1);
    });

    it("should call GCP delete when deleting XML zip", async () => {
      await deleteFromStorage(ecrId, "gcp", "xml");
      expect(deleteFromGCP).toHaveBeenCalledWith(`${ecrId}.zip`);
      expect(deleteFromGCP).toHaveBeenCalledTimes(1);
    });

    it("should return an error for an invalid save source", async () => {
      const result = await deleteFromStorage(ecrId, "invalid-source", "xml");

      expect(result).toEqual({
        message:
          'Invalid save source. Please provide a valid value for \'saveSource\' ("s3", "azure", or "gcp").',
        status: 400,
      });
    });
  });
});
