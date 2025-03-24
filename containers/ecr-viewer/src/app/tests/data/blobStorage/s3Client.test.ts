/**
 * @jest-environment node
 */
import { s3HealthCheck, s3Client } from "@/app/data/blobStorage/s3Client";

jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
  HeadBucketCommand: jest.fn(),
}));

describe("s3 health check", () => {
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
