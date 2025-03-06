/**
 * @jest-environment node
 */
import { S3ServiceException } from "@aws-sdk/client-s3";
import { BlobServiceClient } from "@azure/storage-blob";

import {
  get_azure,
  get_fhir_data,
  get_s3,
} from "@/app/api/fhir-data/fhir-data-service";
import { AZURE_SOURCE, S3_SOURCE } from "@/app/api/utils";
import { s3Client } from "@/app/data/blobStorage/s3Client";

jest.mock("../../../data/db/postgres_db", () => ({
  getDB: jest.fn(),
}));

jest.mock("../../../data/blobStorage/s3Client");

jest.mock("@azure/storage-blob", () => ({
  BlobServiceClient: {
    fromConnectionString: jest.fn(),
  },
}));

jest.mock("../../../api/utils", () => {
  const originalModule = jest.requireActual("../../../api/utils");
  return {
    ...originalModule,
    streamToJson: (body: string) => body,
  };
});

const defaultFhirBundle = "hi";
const simpleResponse = {
  fhirBundle: defaultFhirBundle,
};

describe("get_fhir_data", () => {
  afterEach(() => {
    process.env.SOURCE = S3_SOURCE;
    jest.resetAllMocks();
  });

  it("should return a 500 response when METADATA_DATABASE_TYPE is invalid", async () => {
    (process.env.SOURCE as any) = "p0$+gre$";

    const response = await get_fhir_data("123");

    jest.spyOn(console, "error").mockImplementation();
    expect(response.status).toEqual(500);
    expect(await response.json()).toEqual({
      message: "Invalid source",
    });
  });
});

describe("get_s3", () => {
  afterEach(() => {
    process.env.SOURCE = S3_SOURCE;
    jest.resetAllMocks();
  });

  it("should return ecr when database query succeeds", async () => {
    s3Client.send = jest.fn().mockReturnValue({ Body: defaultFhirBundle });
    const response = await get_s3("123");

    expect(response.status).toEqual(200);
    expect(response.payload).toEqual({
      fhirBundle: defaultFhirBundle,
    });
    expect(s3Client.send).toHaveBeenCalledTimes(1);
  });

  it("should be called by get_fhir_data when source is S3", async () => {
    process.env.SOURCE = S3_SOURCE;
    s3Client.send = jest.fn().mockReturnValue({ Body: defaultFhirBundle });
    const response = await get_fhir_data("123");

    expect(response.status).toEqual(200);
    expect(await response.json()).toEqual(simpleResponse);
    expect(s3Client.send).toHaveBeenCalledTimes(1);
  });

  it("should return a 404 error response when id is unknown", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});

    s3Client.send = jest.fn().mockImplementation(async () => {
      throw new S3ServiceException({
        name: "NoSuchKey",
        message: "No such Key",
        $fault: "server",
        $metadata: {},
      });
    });
    const response = await get_s3("123");
    expect(response.status).toEqual(404);
    expect(response.payload).toEqual({ message: "eCR ID not found" });
    expect(s3Client.send).toHaveBeenCalledTimes(1);
  });

  it("should return a 500 error response when an unexpected error occurs", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});

    s3Client.send = jest.fn().mockImplementation(async () => {
      throw new S3ServiceException({
        name: "Something else",
        message: "Oh no!",
        $fault: "server",
        $metadata: {},
      });
    });
    const response = await get_s3("123");
    expect(response.status).toEqual(500);
    expect(response.payload).toEqual({ message: "Oh no!" });
    expect(s3Client.send).toHaveBeenCalledTimes(1);
  });

  it("should return a 500 error response when error is not an S3ServiceException", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});

    s3Client.send = jest.fn().mockImplementation(async () => {
      throw new Error("test error");
    });
    const response = await get_s3("123");
    expect(response.status).toEqual(500);
    expect(response.payload).toEqual({ message: "test error" });
    expect(s3Client.send).toHaveBeenCalledTimes(1);
  });
});

describe("get_azure", () => {
  const blockBlobClient = {
    download: jest.fn(),
  };

  beforeEach(() => {
    const containerClient = {
      getBlobClient: jest.fn().mockReturnValue(blockBlobClient),
    };

    const blobClient = {
      getContainerClient: jest.fn().mockReturnValue(containerClient),
    };

    (BlobServiceClient.fromConnectionString as jest.Mock).mockReturnValue(
      blobClient,
    );
  });

  afterEach(() => {
    process.env.SOURCE = S3_SOURCE;
    jest.resetAllMocks();
  });

  it("should return ecr when database query succeeds", async () => {
    blockBlobClient.download = jest
      .fn()
      .mockReturnValue({ readableStreamBody: defaultFhirBundle });
    const response = await get_azure("123");

    expect(response.status).toEqual(200);
    expect(response.payload).toEqual({
      fhirBundle: defaultFhirBundle,
    });
    expect(blockBlobClient.download).toHaveBeenCalledTimes(1);
  });

  it("should be called by get_fhir_data when source is azure", async () => {
    process.env.SOURCE = AZURE_SOURCE;
    blockBlobClient.download = jest
      .fn()
      .mockReturnValue({ readableStreamBody: defaultFhirBundle });
    const response = await get_fhir_data("123");

    expect(response.status).toEqual(200);
    expect(await response.json()).toEqual(simpleResponse);
    expect(blockBlobClient.download).toHaveBeenCalledTimes(1);
  });

  it("should return an 404 error response when id unknown", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});

    blockBlobClient.download = jest.fn().mockImplementation(async () => {
      throw { statusCode: 404, code: "ResourceNotFound" };
    });
    const response = await get_azure("123");
    expect(response.status).toEqual(404);
    expect(response.payload).toEqual({ message: "eCR ID not found" });
    expect(blockBlobClient.download).toHaveBeenCalledTimes(1);
  });

  it("should return an 500 error response when database query fails", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});

    blockBlobClient.download = jest.fn().mockImplementation(async () => {
      throw { statusCode: 409, message: "Oh no!" };
    });
    const response = await get_azure("123");
    expect(response.status).toEqual(500);
    expect(response.payload).toEqual({ message: "Oh no!" });
    expect(blockBlobClient.download).toHaveBeenCalledTimes(1);
  });
});
