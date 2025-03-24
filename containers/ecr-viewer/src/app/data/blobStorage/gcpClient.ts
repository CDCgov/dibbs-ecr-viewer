import { Storage } from "@google-cloud/storage";

import { GCP_SOURCE } from "@/app/api/utils";

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
