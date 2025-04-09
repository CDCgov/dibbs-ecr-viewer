/**
 * @jest-environment node
 */
import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";

import { AZURE_SOURCE, S3_SOURCE } from "@/app/api/utils";
import {
  azureBlobContainerClient,
  azureBlobStorageHealthCheck,
  deleteFromAzure,
  saveToAzure,
} from "@/app/data/blobStorage/azureClient";

jest.mock("@azure/storage-blob");

const fhirBundleString = "{hi: 1}";
const fileName = "test.json";

describe("azure blob container", () => {
  describe("client", () => {
    it("should create container client", () => {
      process.env.AZURE_STORAGE_CONNECTION_STRING = "connection";
      process.env.AZURE_CONTAINER_NAME = "container";
      const mockGetContainerClient = jest
        .fn()
        .mockReturnValue({} as ContainerClient);
      (BlobServiceClient.fromConnectionString as jest.Mock).mockReturnValue({
        getContainerClient: mockGetContainerClient,
      });

      azureBlobContainerClient();

      expect(BlobServiceClient.fromConnectionString).toHaveBeenCalledWith(
        "connection",
      );
      expect(mockGetContainerClient).toHaveBeenCalledWith("container");
    });

    it("should create container client with ECR_BUCKET_NAME", () => {
      process.env.AZURE_STORAGE_CONNECTION_STRING = "connection";
      delete process.env.AZURE_CONTAINER_NAME;
      process.env.ECR_BUCKET_NAME = "container2";
      const mockGetContainerClient = jest
        .fn()
        .mockReturnValue({} as ContainerClient);
      (BlobServiceClient.fromConnectionString as jest.Mock).mockReturnValue({
        getContainerClient: mockGetContainerClient,
      });

      azureBlobContainerClient();

      expect(BlobServiceClient.fromConnectionString).toHaveBeenCalledWith(
        "connection",
      );
      expect(mockGetContainerClient).toHaveBeenCalledWith("container2");
    });
  });

  describe("health check", () => {
    let mockExists: jest.Mock;

    beforeEach(() => {
      mockExists = jest.fn();
      (BlobServiceClient.fromConnectionString as jest.Mock).mockReturnValue({
        getContainerClient: jest.fn().mockReturnValue({
          exists: mockExists,
        }),
      });
    });

    afterEach(() => {
      jest.resetAllMocks();
      delete process.env.AZURE_STORAGE_CONNECTION_STRING;
      delete process.env.AZURE_CONTAINER_NAME;
    });

    it("should return UNDEFINED if SOURCE is not azure", async () => {
      process.env.SOURCE = S3_SOURCE;
      expect(await azureBlobStorageHealthCheck()).toBeUndefined();
    });

    it("should return UP when the container exists", async () => {
      process.env.SOURCE = AZURE_SOURCE;
      process.env.AZURE_STORAGE_CONNECTION_STRING = "connection";
      process.env.AZURE_CONTAINER_NAME = "container";
      mockExists.mockResolvedValue(true);

      const result = await azureBlobStorageHealthCheck();
      expect(result).toEqual("UP");
    });

    it("should return DOWN when the container is not initialized", async () => {
      process.env.SOURCE = AZURE_SOURCE;
      delete process.env.AZURE_STORAGE_CONNECTION_STRING;
      mockExists.mockResolvedValue(false);

      const result = await azureBlobStorageHealthCheck();
      expect(result).toEqual("DOWN");
    });

    it("should return DOWN when the container does not exist", async () => {
      jest.spyOn(console, "error").mockImplementation();
      process.env.SOURCE = AZURE_SOURCE;
      mockExists.mockResolvedValue(false);

      const result = await azureBlobStorageHealthCheck();
      expect(result).toEqual("DOWN");
    });

    it("should return DOWN when the container throws an error", async () => {
      jest.spyOn(console, "error").mockImplementation();
      process.env.SOURCE = AZURE_SOURCE;
      mockExists.mockRejectedValue(new Error("Connection error"));

      const result = await azureBlobStorageHealthCheck();
      expect(result).toEqual("DOWN");
    });
  });

  describe("save blob", () => {
    it("should return 200 when saving to Azure succeeds", async () => {
      process.env.SOURCE = AZURE_SOURCE;
      process.env.AZURE_STORAGE_CONNECTION_STRING = "connection";
      process.env.AZURE_CONTAINER_NAME = "container";
      const mockUpload = jest
        .fn()
        .mockResolvedValue({ _response: { status: 201 } });
      const mockBlockBlobClient = jest.fn().mockReturnValue({
        upload: mockUpload,
      });
      const mockGetContainerClient = jest
        .fn()
        .mockReturnValue({ getBlockBlobClient: mockBlockBlobClient });
      (BlobServiceClient.fromConnectionString as jest.Mock).mockReturnValue({
        getContainerClient: mockGetContainerClient,
      });

      const result = await saveToAzure(fhirBundleString, fileName);

      expect(result).toEqual({
        message: "Success. Saved FHIR bundle.",
        status: 200,
      });
      expect(mockBlockBlobClient).toHaveBeenCalledExactlyOnceWith(fileName);
      expect(mockUpload).toHaveBeenCalledOnce();
      expect(mockUpload).toHaveBeenCalledWith(
        fhirBundleString,
        fhirBundleString.length,
        {
          blobHTTPHeaders: { blobContentType: "application/json" },
        },
      );
    });

    it("should return 500 when saving to Azure succeeds", async () => {
      process.env.SOURCE = AZURE_SOURCE;
      process.env.AZURE_STORAGE_CONNECTION_STRING = "connection";
      process.env.AZURE_CONTAINER_NAME = "container";
      const mockUpload = jest
        .fn()
        .mockResolvedValue({ _response: { status: 500 } });
      const mockBlockBlobClient = jest.fn().mockReturnValue({
        upload: mockUpload,
      });
      const mockGetContainerClient = jest
        .fn()
        .mockReturnValue({ getBlockBlobClient: mockBlockBlobClient });
      (BlobServiceClient.fromConnectionString as jest.Mock).mockReturnValue({
        getContainerClient: mockGetContainerClient,
      });
      jest.spyOn(console, "error").mockImplementation(() => {});

      const result = await saveToAzure(fhirBundleString, fileName);

      expect(result).toEqual({
        message: "Failed to save FHIR bundle.",
        status: 500,
      });
    });
  });

  describe("delete blob", () => {
    it("should return 200 when saving to Azure succeeds", async () => {
      process.env.SOURCE = AZURE_SOURCE;
      process.env.AZURE_STORAGE_CONNECTION_STRING = "connection";
      process.env.AZURE_CONTAINER_NAME = "container";
      const mockDelete = jest
        .fn()
        .mockResolvedValue({ _response: { status: 200 }, succeeded: true });
      const mockBlockBlobClient = jest.fn().mockReturnValue({
        deleteIfExists: mockDelete,
      });
      const mockGetContainerClient = jest
        .fn()
        .mockReturnValue({ getBlockBlobClient: mockBlockBlobClient });
      (BlobServiceClient.fromConnectionString as jest.Mock).mockReturnValue({
        getContainerClient: mockGetContainerClient,
      });

      const result = await deleteFromAzure(fileName);

      expect(result).toEqual({
        message: "Success. Deleted FHIR bundle.",
        status: 200,
      });
      expect(mockBlockBlobClient).toHaveBeenCalledExactlyOnceWith(fileName);
      expect(mockDelete).toHaveBeenCalledOnce();
    });

    it("should return 500 when saving to Azure succeeds", async () => {
      process.env.SOURCE = AZURE_SOURCE;
      process.env.AZURE_STORAGE_CONNECTION_STRING = "connection";
      process.env.AZURE_CONTAINER_NAME = "container";
      const mockDelete = jest
        .fn()
        .mockResolvedValue({ _response: { status: 403 }, succeeded: false });
      const mockBlockBlobClient = jest.fn().mockReturnValue({
        deleteIfExists: mockDelete,
      });
      const mockGetContainerClient = jest
        .fn()
        .mockReturnValue({ getBlockBlobClient: mockBlockBlobClient });
      (BlobServiceClient.fromConnectionString as jest.Mock).mockReturnValue({
        getContainerClient: mockGetContainerClient,
      });
      jest.spyOn(console, "error").mockImplementation(() => {});

      const result = await deleteFromAzure(fileName);

      expect(result).toEqual({
        message: "Failed to delete FHIR bundle.",
        status: 500,
      });
    });
  });
});
