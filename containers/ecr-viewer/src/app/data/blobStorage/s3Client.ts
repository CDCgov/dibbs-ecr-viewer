import { HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";

import { S3_SOURCE } from "@/app/api/utils";

export const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  endpoint: process.env.AWS_CUSTOM_ENDPOINT,
  forcePathStyle: process.env.AWS_CUSTOM_ENDPOINT !== undefined,
});

/**
 * Performs a health check on the AWS S3 connection.
 * @returns The status of the AWS S3 connection or undefined if missing environment values.
 */
export const s3HealthCheck = async () => {
  if (process.env.SOURCE !== S3_SOURCE) {
    return undefined;
  }
  try {
    const resp = await s3Client.send(
      new HeadBucketCommand({ Bucket: process.env.ECR_BUCKET_NAME }),
    );
    if (resp.$metadata.httpStatusCode === 200) {
      return "UP";
    }
    console.error(resp);
    return "DOWN";
  } catch (error: unknown) {
    console.error(error);
    return "DOWN";
  }
};
