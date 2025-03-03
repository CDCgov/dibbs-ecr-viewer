import { HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";

export const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  endpoint: process.env.AWS_CUSTOM_ENDPOINT,
  forcePathStyle: process.env.AWS_CUSTOM_ENDPOINT !== undefined,
});

/**
 * Performs a health check on the AWS S3 connection.
 * @returns The status of the AWS S3 connection or undefined if missing necessary values.
 */
export const s3HealthCheck = async () => {
  if (!process.env.ECR_BUCKET_NAME) {
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
