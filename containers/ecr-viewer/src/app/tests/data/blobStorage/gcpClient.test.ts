import { Storage } from "@google-cloud/storage";

import {
  deleteFromGCP,
  gcpClient,
  gcpHealthCheck,
  saveToGCP,
} from "@/app/data/blobStorage/gcpClient";

const mockExists = jest.fn();

const mockDelete = jest.fn().mockResolvedValue(undefined);
const mockSave = jest.fn().mockResolvedValue(undefined);
const mockFile = jest
  .fn()
  .mockReturnValue({ save: mockSave, delete: mockDelete });

const mockBucket = jest.fn().mockImplementation(() => ({
  exists: mockExists,
  file: mockFile,
}));

jest.mock("@google-cloud/storage", () => {
  return {
    Storage: jest.fn(() => ({
      bucket: mockBucket,
    })),
  };
});

const fhirBundleString = "{hi: 1}";
const fileName = "test.json";

describe("gcp", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ECR_BUCKET_NAME = "fake-bucket";
    process.env.SOURCE = "gcp";
  });

  afterAll(() => {
    jest.resetAllMocks();
    process.env.ECR_BUCKET_NAME = "";
    process.env.SOURCE = "s3";
    delete process.env.GCP_API_ENDPOINT;
    delete process.env.GCP_PROJECT_ID;
    delete process.env.GCP_CREDENTIALS;
  });

  describe("client", () => {
    it("should return undefined if ECR_BUCKET_NAME is not set", () => {
      process.env.ECR_BUCKET_NAME = "";
      expect(gcpClient()).toBeUndefined();
    });

    it("should return undefined if SOURCE is not gcp", () => {
      process.env.SOURCE = "s3";
      expect(gcpClient()).toBeUndefined();
    });

    it("should call Storage without any values", () => {
      const bucket = gcpClient();

      expect(bucket).toBeDefined();
      expect(mockBucket).toHaveBeenCalledExactlyOnceWith("fake-bucket");
      expect(Storage).toHaveBeenCalledExactlyOnceWith({
        apiEndpoint: undefined,
        credentials: undefined,
        projectId: undefined,
      });
    });
    it("should call Storage without any values", () => {
      const bucket = gcpClient();

      expect(bucket).toBeDefined();
      expect(mockBucket).toHaveBeenCalledExactlyOnceWith("fake-bucket");
      expect(Storage).toHaveBeenCalledExactlyOnceWith({
        apiEndpoint: undefined,
        credentials: undefined,
        projectId: undefined,
      });
    });

    it("should call Storage without all related environment variables", () => {
      process.env.GCP_API_ENDPOINT = "http://localhost:8080";
      process.env.GCP_PROJECT_ID = "projectId";
      process.env.GCP_CREDENTIALS = JSON.stringify({ key: "fake-key" });
      const bucket = gcpClient();

      expect(bucket).toBeDefined();
      expect(mockBucket).toHaveBeenCalledExactlyOnceWith("fake-bucket");
      expect(Storage).toHaveBeenCalledExactlyOnceWith({
        apiEndpoint: "http://localhost:8080",
        credentials: { key: "fake-key" },
        projectId: "projectId",
      });
    });
  });

  describe("health check", () => {
    it("should return 'UP' if the bucket exists", async () => {
      mockExists.mockResolvedValue([true]);

      const result = await gcpHealthCheck();

      expect(result).toBe("UP");
      expect(mockExists).toHaveBeenCalled();
    });

    it("should return 'DOWN' if the bucket does not exist", async () => {
      jest.spyOn(console, "error").mockImplementation(() => {});
      mockExists.mockResolvedValue([false]);

      const result = await gcpHealthCheck();

      expect(result).toBe("DOWN");
      expect(mockExists).toHaveBeenCalled();
    });

    it("should return 'DOWN' if there is an error", async () => {
      jest.spyOn(console, "error").mockImplementation(() => {});
      mockExists.mockResolvedValue([false]);

      const result = await gcpHealthCheck();

      expect(result).toBe("DOWN");
      expect(mockExists).toHaveBeenCalled();
    });

    it("should return 'DOWN' if an error is thrown", async () => {
      jest.spyOn(console, "error").mockImplementation(() => {});
      mockExists.mockRejectedValue(new Error("Uh oh"));

      const result = await gcpHealthCheck();

      expect(result).toBe("DOWN");
    });

    it("should return undefined if ECR_BUCKET_NAME is not set", async () => {
      process.env.ECR_BUCKET_NAME = "";

      const result = await gcpHealthCheck();

      expect(result).toBeUndefined();
    });

    it("should return undefined if SOURCE is not gcp", async () => {
      process.env.SOURCE = "s3";

      const result = await gcpHealthCheck();

      expect(result).toBeUndefined();
    });
  });

  describe("save blob", () => {
    it("should return 200 when saving to GCP succeeds", async () => {
      const result = await saveToGCP(fhirBundleString, fileName);

      expect(result).toEqual({
        message: "Success. Saved FHIR bundle.",
        status: 200,
      });
      expect(mockFile).toHaveBeenCalledExactlyOnceWith(fileName);
      expect(mockSave).toHaveBeenCalledExactlyOnceWith(fhirBundleString);
    });

    it("should return 500 when saving to GCP fails", async () => {
      jest.spyOn(console, "error").mockImplementation(() => {});
      mockSave.mockRejectedValue(new Error("Failed to save"));

      const result = await saveToGCP(fhirBundleString, fileName);

      expect(result).toEqual({
        message: "Failed to save FHIR bundle.",
        status: 500,
      });
    });

    it("should return 500 when GCP is not configured", async () => {
      process.env.SOURCE = "azure";
      const result = await saveToGCP(fhirBundleString, fileName);

      expect(result).toEqual({
        message: "Failed to save the FHIR bundle due to misconfiguration.",
        status: 500,
      });
    });
  });

  describe("delete blob", () => {
    it("should return 200 when deleting from GCP succeeds", async () => {
      const result = await deleteFromGCP(fileName);

      expect(result).toEqual({
        message: "Success. Deleted FHIR bundle.",
        status: 200,
      });
      expect(mockFile).toHaveBeenCalledExactlyOnceWith(fileName);
      expect(mockDelete).toHaveBeenCalledExactlyOnceWith();
    });

    it("should return 500 when deleting from GCP fails", async () => {
      jest.spyOn(console, "error").mockImplementation(() => {});
      mockDelete.mockRejectedValue(new Error("Failed to delete"));

      const result = await deleteFromGCP(fileName);

      expect(result).toEqual({
        message: "Failed to delete FHIR bundle.",
        status: 500,
      });
    });

    it("should return 500 when GCP is not configured", async () => {
      process.env.SOURCE = "azure";
      const result = await deleteFromGCP(fileName);

      expect(result).toEqual({
        message: "Failed to delete the FHIR bundle due to misconfiguration.",
        status: 500,
      });
    });
  });
});
