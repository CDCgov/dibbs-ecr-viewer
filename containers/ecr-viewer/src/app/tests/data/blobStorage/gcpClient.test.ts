import { Storage } from "@google-cloud/storage";

import { gcpClient, gcpHealthCheck } from "@/app/data/blobStorage/gcpClient";

const mockExists = jest.fn();

const mockBucket = jest.fn().mockImplementation(() => ({
  exists: mockExists,
}));

jest.mock("@google-cloud/storage", () => {
  return {
    Storage: jest.fn(() => ({
      bucket: mockBucket,
    })),
  };
});
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
});
