import { Storage } from "@google-cloud/storage";

import { gcsClient, gcsHealthCheck } from "@/app/data/blobStorage/gcsClient";

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
describe("gcs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GCS_BUCKET_NAME = "fake-bucket";
  });

  afterAll(() => {
    jest.resetAllMocks();
    delete process.env.GCS_BUCKET_NAME;
    delete process.env.GCS_API_ENDPOINT;
    delete process.env.GCP_PROJECT_ID;
    delete process.env.GCP_CREDENTIALS;
  });

  describe("client", () => {
    it("should return undefined if env variables are not set", () => {
      delete process.env.GCS_BUCKET_NAME;
      expect(gcsClient()).toBeUndefined();
    });

    it("should call Storage without any values", () => {
      const bucket = gcsClient();

      expect(bucket).toBeDefined();
      expect(mockBucket).toHaveBeenCalledExactlyOnceWith("fake-bucket");
      expect(Storage).toHaveBeenCalledExactlyOnceWith({
        apiEndpoint: undefined,
        credentials: undefined,
        projectId: undefined,
      });
    });
    it("should call Storage without any values", () => {
      const bucket = gcsClient();

      expect(bucket).toBeDefined();
      expect(mockBucket).toHaveBeenCalledExactlyOnceWith("fake-bucket");
      expect(Storage).toHaveBeenCalledExactlyOnceWith({
        apiEndpoint: undefined,
        credentials: undefined,
        projectId: undefined,
      });
    });

    it("should call Storage without all related environment variables", () => {
      process.env.GCS_API_ENDPOINT = "http://localhost:8080";
      process.env.GCP_PROJECT_ID = "projectId";
      process.env.GCP_CREDENTIALS = JSON.stringify({ key: "fake-key" });
      const bucket = gcsClient();

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

      const result = await gcsHealthCheck();

      expect(result).toBe("UP");
      expect(mockExists).toHaveBeenCalled();
    });

    it("should return 'DOWN' if the bucket does not exist", async () => {
      jest.spyOn(console, "error").mockImplementation(() => {});
      mockExists.mockResolvedValue([false]);

      const result = await gcsHealthCheck();

      expect(result).toBe("DOWN");
      expect(mockExists).toHaveBeenCalled();
    });

    it("should return 'DOWN' if there is an error", async () => {
      jest.spyOn(console, "error").mockImplementation(() => {});
      mockExists.mockResolvedValue([false]);

      const result = await gcsHealthCheck();

      expect(result).toBe("DOWN");
      expect(mockExists).toHaveBeenCalled();
    });

    it("should return undefined if GCS_BUCKET_NAME is not set", async () => {
      delete process.env.GCS_BUCKET_NAME;

      const result = await gcsHealthCheck();

      expect(result).toBeUndefined();
    });
  });
});
