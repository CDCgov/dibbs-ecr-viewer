import { BlobServiceClient } from "@azure/storage-blob";

import {
  AZURE_SOURCE,
  BlobResponse,
  DELETE_FAILURE,
  DELETE_MISCONFIGURED,
  DELETE_SUCCESS,
  SAVE_FAILURE,
  SAVE_MISCONFIGURED,
  SAVE_SUCCESS,
} from "./utils";

/**
 * Connect to the Azure blob container.
 * @returns A promise resolving to a azure blob container client.
 */
export const azureBlobContainerClient = () => {
  if (process.env.AZURE_STORAGE_CONNECTION_STRING) {
    const blobClient = BlobServiceClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING,
    );
    const containerClient = blobClient.getContainerClient(
      process.env.AZURE_CONTAINER_NAME || process.env.ECR_BUCKET_NAME,
    );

    return containerClient;
  }
  return undefined;
};

/**
 * Performs a health check on the Azure Blob Storage connection.
 * @returns The status of the azure blob connection or undefined if missing environment values.
 */
export const azureBlobStorageHealthCheck = async () => {
  if (process.env.SOURCE !== AZURE_SOURCE) {
    return undefined;
  }
  try {
    const containerClient = azureBlobContainerClient();

    if (!containerClient) {
      return "DOWN";
    }
    if (await containerClient.exists()) {
      return "UP";
    }
    console.error("Container name not found");
    return "DOWN";
  } catch (error: unknown) {
    console.error(error);
    return "DOWN";
  }
};

/**
 * Saves a blob to Azure Blob Storage.
 * @param body - The string or buffer(zip) content to save as a blob.
 * @param objectKey - The name of the blob.
 * @returns An object containing the status and message.
 */
export const saveToAzure = async (
  body: string | Buffer,
  objectKey: string,
): Promise<BlobResponse> => {
  const containerClient = azureBlobContainerClient();

  if (!containerClient) {
    return SAVE_MISCONFIGURED;
  }

  try {

    const isBuffer = Buffer.isBuffer(body);

    const contentType = isBuffer
        ? "application/zip"
        : "application/json";

    const blockBlobClient = containerClient.getBlockBlobClient(objectKey);

    const response = await blockBlobClient.upload(body, body.length, {
      blobHTTPHeaders: { blobContentType: contentType },
    });

    if (response._response.status !== 201) {
      throw new Error(`HTTP Status Code: ${response._response.status}`);
    }

    return SAVE_SUCCESS;
  } catch (error: unknown) {
    console.error({
      message: "Failed to save blob to Azure Blob Storage.",
      error,
      objectKey,
    });
    return SAVE_FAILURE;
  }
};

/**
 * Delete a blob from Azure Blob Storage.
 * @param objectKey - The name of the blob.
 * @returns An object containing the status and message.
 */
export const deleteFromAzure = async (
  objectKey: string,
): Promise<BlobResponse> => {
  const containerClient = azureBlobContainerClient();

  if (!containerClient) {
    return DELETE_MISCONFIGURED;
  }

  try {
    const blockBlobClient = containerClient.getBlockBlobClient(objectKey);

    const response = await blockBlobClient.deleteIfExists();

    if (!response.succeeded) {
      throw new Error(`HTTP Status Code: ${response._response.status}`);
    }
    return DELETE_SUCCESS;
  } catch (error: unknown) {
    console.error({
      message: "Failed to save blob to Azure Blob Storage.",
      error,
      objectKey,
    });
    return DELETE_FAILURE;
  }
};
