import { BlobServiceClient } from "@azure/storage-blob";

/**
 * Connect to the Azure blob container.
 * @returns A promise resolving to a azure blob container client.
 */
export const azureBlobContainerClient = () => {
  const blobClient = BlobServiceClient.fromConnectionString(
    process.env.AZURE_STORAGE_CONNECTION_STRING,
  );
  const containerClient = blobClient.getContainerClient(
    process.env.AZURE_CONTAINER_NAME,
  );

  return containerClient;
};

/**
 * Performs a health check on the Azure Blob Storage connection.
 * @returns The status of the azure blob connection or undefined if missing environment values.
 */
export const azureBlobStorageHealthCheck = async () => {
  if (
    !process.env.AZURE_STORAGE_CONNECTION_STRING ||
    !process.env.AZURE_CONTAINER_NAME
  ) {
    return undefined;
  }
  try {
    const containerClient = azureBlobContainerClient();

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
