import { Storage } from "@google-cloud/storage";

import {
  GCP_SOURCE,
  BlobResponse,
  DELETE_FAILURE,
  DELETE_MISCONFIGURED,
  DELETE_SUCCESS,
  SAVE_FAILURE,
  SAVE_MISCONFIGURED,
  SAVE_SUCCESS,
} from "./utils";

/**
 * Connect to the google cloud storage bucket.
 * @returns The google cloud storage bucket.
 */
export const gcpClient = () => {
  if (process.env.SOURCE === GCP_SOURCE && process.env.ECR_BUCKET_NAME) {
    const storage = new Storage({
      apiEndpoint: process.env.GCP_API_ENDPOINT,
      projectId: process.env.GCP_PROJECT_ID,
      credentials: process.env.GCP_CREDENTIALS
        ? JSON.parse(process.env.GCP_CREDENTIALS)
        : undefined,
    });
    return storage.bucket(process.env.ECR_BUCKET_NAME);
  }
};

/**
 * Performs a health check on the Google cloud storage connection.
 * @returns The status of the google cloud storage connection or undefined if missing environment values.
 */
export const gcpHealthCheck = async () => {
  if (process.env.SOURCE !== GCP_SOURCE || !process.env.ECR_BUCKET_NAME) {
    return undefined;
  }
  try {
    const client = gcpClient();

    if ((await client?.exists())?.[0]) {
      return "UP";
    }
    console.error("Failed to connect to GCP. Bucket does not exist.");
    return "DOWN";
  } catch (error: unknown) {
    console.error(error);
    return "DOWN";
  }
};

/**
 * Saves content to Google Cloud Storage.
 * @param body - The string content to be saved.
 * @param objectKey - The unique ID for the blob.
 * @returns An object containing the status and message.
 */
export const saveToGCP = async (
  body: string,
  objectKey: string,
): Promise<BlobResponse> => {
  const containerClient = gcpClient();

  if (!containerClient) {
    return SAVE_MISCONFIGURED;
  }
  try {
    await containerClient.file(objectKey).save(body);

    return SAVE_SUCCESS;
  } catch (error: unknown) {
    console.error({
      message: "Failed to save blob to Google Cloud Storage.",
      error,
      objectKey,
    });
    return SAVE_FAILURE;
  }
};

/**
 * Deletes content from Google Cloud Storage.
 * @param objectKey - The unique ID for the blob.
 * @returns An object containing the status and message.
 */
export const deleteFromGCP = async (
  objectKey: string,
): Promise<BlobResponse> => {
  const containerClient = gcpClient();

  if (!containerClient) {
    return DELETE_MISCONFIGURED;
  }
  try {
    await containerClient.file(objectKey).delete();

    return DELETE_SUCCESS;
  } catch (error: unknown) {
    console.error({
      message: "Failed to delete blob to Google Cloud Storage.",
      error,
      objectKey,
    });
    return DELETE_FAILURE;
  }
};
