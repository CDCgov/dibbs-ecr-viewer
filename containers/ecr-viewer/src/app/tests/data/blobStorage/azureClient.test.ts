/**
 * @jest-environment node
 */
import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";

import {
  azureBlobContainerClient,
  azureBlobStorageHealthCheck,
} from "@/app/data/blobStorage/azureClient";

jest.mock("@azure/storage-blob");

describe("azure blob container", () => {
  describe("client", () => {
    it("should create container client with AZURE_CONTAINER_NAME", () => {
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
      process.env.AZURE_CONTAINER_NAME = "";
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
      process.env.AZURE_STORAGE_CONNECTION_STRING = "";
      process.env.AZURE_CONTAINER_NAME = "";
      process.env.ECR_BUCKET_NAME = "";
    });
    it("should return UNDEFINED if missing connection string", async () => {
      process.env.AZURE_STORAGE_CONNECTION_STRING = "";
      process.env.AZURE_CONTAINER_NAME = "container";
      expect(await azureBlobStorageHealthCheck()).toBeUndefined();
    });
    it("should return UNDEFINED if missing container name", async () => {
      process.env.AZURE_STORAGE_CONNECTION_STRING = "connection";
      process.env.AZURE_CONTAINER_NAME = "";
      process.env.ECR_BUCKET_NAME = "";
      expect(await azureBlobStorageHealthCheck()).toBeUndefined();
    });
    it("should return UP when provided ECR_BUCKET_NAME and not AZURE_CONTAINER_NAME", async () => {
      process.env.AZURE_STORAGE_CONNECTION_STRING = "connection";
      process.env.AZURE_CONTAINER_NAME = "";
      process.env.ECR_BUCKET_NAME = "container";
      mockExists.mockResolvedValue(true);

      const result = await azureBlobStorageHealthCheck();
      expect(result).toEqual("UP");
    });
    it("should return UP when the container exists", async () => {
      process.env.AZURE_STORAGE_CONNECTION_STRING = "connection";
      process.env.AZURE_CONTAINER_NAME = "container";
      mockExists.mockResolvedValue(true);

      const result = await azureBlobStorageHealthCheck();
      expect(result).toEqual("UP");
    });
    it("should return DOWN when the container does not exist", async () => {
      jest.spyOn(console, "error").mockImplementation();
      process.env.AZURE_STORAGE_CONNECTION_STRING = "connection";
      process.env.AZURE_CONTAINER_NAME = "??";
      mockExists.mockResolvedValue(false);

      const result = await azureBlobStorageHealthCheck();
      expect(result).toEqual("DOWN");
    });
    it("should return DOWN when the container throws an error", async () => {
      jest.spyOn(console, "error").mockImplementation();
      process.env.AZURE_STORAGE_CONNECTION_STRING = "??";
      process.env.AZURE_CONTAINER_NAME = "container";
      mockExists.mockRejectedValue(new Error("Connection error"));

      const result = await azureBlobStorageHealthCheck();
      expect(result).toEqual("DOWN");
    });
  });
});
