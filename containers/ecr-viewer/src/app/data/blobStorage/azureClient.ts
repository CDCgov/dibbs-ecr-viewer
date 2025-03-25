import { BlobServiceClient } from "@azure/storage-blob";

import { AZURE_SOURCE } from "@/app/api/utils";

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
