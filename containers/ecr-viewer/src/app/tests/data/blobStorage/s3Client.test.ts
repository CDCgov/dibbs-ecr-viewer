/**
 * @jest-environment node
 */
import {
  s3HealthCheck,
  s3Client,
  saveToS3,
} from "@/app/data/blobStorage/s3Client";

jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
  HeadBucketCommand: jest.fn(),
  PutObjectCommand: jest.fn().mockImplementation((input) => ({
    input,
  })),
}));

const fhirBundleString = "{hi: 1}";
const fileName = "test.json";

describe("s3 client", () => {
  let mockSend: jest.Mock;

  beforeEach(() => {
    mockSend = jest.fn();
    (s3Client.send as jest.Mock) = mockSend;
  });

  afterEach(() => {
    jest.resetAllMocks();
    process.env.ECR_BUCKET_NAME = "";
    process.env.SOURCE = "s3";
  });

  describe("health check", () => {
    it("should return UNDEFINED if SOURCE is not s3", async () => {
      process.env.SOURCE = "azure";
      expect(await s3HealthCheck()).toBeUndefined();
    });

    it("should return UP when health command succeeds", async () => {
      process.env.SOURCE = "s3";
      mockSend.mockResolvedValue({ $metadata: { httpStatusCode: 200 } });

      const result = await s3HealthCheck();
      expect(result).toEqual("UP");
    });

    it("should return DOWN when health command fails", async () => {
      jest.spyOn(console, "error").mockImplementation();
      process.env.SOURCE = "s3";
      mockSend.mockResolvedValue({ $metadata: { httpStatusCode: 404 } });

      const result = await s3HealthCheck();
      expect(result).toEqual("DOWN");
    });

    it("should return DOWN when s3 throws an error", async () => {
      jest.spyOn(console, "error").mockImplementation();
      process.env.SOURCE = "s3";
      mockSend.mockRejectedValue(new Error("Connection failed"));

      const result = await s3HealthCheck();
      expect(result).toEqual("DOWN");
    });
  });

  describe("saveToS3", () => {
    it("should return 200 when saving to s3 succeeds", async () => {
      process.env.ECR_BUCKET_NAME = "bucket";
      process.env.SOURCE = "s3";
      mockSend.mockResolvedValue({
        $metadata: { httpStatusCode: 200 },
      });

      const result = await saveToS3(fhirBundleString, fileName);

      expect(result).toEqual({
        message: "Success. Saved FHIR bundle.",
        status: 200,
      });
      expect(s3Client.send).toHaveBeenCalledOnce();
    });

    it("should return 500 when saving to s3 fails", async () => {
      jest.spyOn(console, "error").mockImplementation(() => {});
      mockSend.mockResolvedValue({
        $metadata: { httpStatusCode: 500 },
      });

      const result = await saveToS3(fhirBundleString, fileName);

      expect(result).toEqual({
        message: "Failed to save FHIR bundle.",
        status: 500,
      });
    });
  });
});
