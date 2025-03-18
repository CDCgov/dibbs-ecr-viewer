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
    process.env.GOOGLE_KEY = JSON.stringify({ key: "fake-key" });
    process.env.GCS_BUCKET_NAME = "fake-bucket";
  });

  afterAll(() => {
    jest.resetAllMocks();
    delete process.env.GOOGLE_KEY;
    delete process.env.GCS_BUCKET_NAME;
  });

  describe("client", () => {
    it("should return undefined if env variables are not set", () => {
      delete process.env.GOOGLE_KEY;
      expect(gcsClient()).toBeUndefined();
    });

    it("should call Storage with GOOGLE_KEY", () => {
      const bucket = gcsClient();

      expect(bucket).toBeDefined();
      expect(mockBucket).toHaveBeenCalledExactlyOnceWith("fake-bucket");
      expect(Storage).toHaveBeenCalledExactlyOnceWith({
        credentials: JSON.parse(process.env.GOOGLE_KEY!),
      });
    });
  });

  describe("health check", () => {
    it("should return 'UP' if the bucket exists", async () => {
      mockExists.mockResolvedValue(true);

      const result = await gcsHealthCheck();

      expect(result).toBe("UP");
      expect(mockExists).toHaveBeenCalled();
    });

    it("should return 'DOWN' if the bucket does not exist", async () => {
      jest.spyOn(console, "error").mockImplementation(() => {});
      mockExists.mockResolvedValue(false);

      const result = await gcsHealthCheck();

      expect(result).toBe("DOWN");
      expect(mockExists).toHaveBeenCalled();
    });

    it("should return 'DOWN' if there is an error", async () => {
      jest.spyOn(console, "error").mockImplementation(() => {});
      mockExists.mockResolvedValue(false);

      const result = await gcsHealthCheck();

      expect(result).toBe("DOWN");
      expect(mockExists).toHaveBeenCalled();
    });

    it("should return undefined if GOOGLE_KEY is not set", async () => {
      delete process.env.GOOGLE_KEY;

      const result = await gcsHealthCheck();

      expect(result).toBeUndefined();
    });

    it("should return undefined if GCS_BUCKET_NAME is not set", async () => {
      delete process.env.GCS_BUCKET_NAME;

      const result = await gcsHealthCheck();

      expect(result).toBeUndefined();
    });
  });
});
