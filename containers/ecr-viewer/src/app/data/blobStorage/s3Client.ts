import {
  DeleteObjectCommand,
  DeleteObjectCommandOutput,
  HeadBucketCommand,
  PutObjectCommand,
  PutObjectCommandOutput,
  S3Client,
} from "@aws-sdk/client-s3";

import {
  S3_SOURCE,
  BlobResponse,
  DELETE_FAILURE,
  DELETE_SUCCESS,
  SAVE_FAILURE,
  SAVE_SUCCESS,
} from "./utils";

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

/**
 * Saves a FHIR bundle to an AWS S3 bucket.
 * @param body - The string or buffer (zip file) content to be saved.
 * @param objectKey - The name of the blob.
 * @returns An object containing the status and message.
 */
export const saveToS3 = async (
  body: string | Buffer,
  objectKey: string,
): Promise<BlobResponse> => {
  const bucketName = process.env.ECR_BUCKET_NAME;
  try {
    const isBuffer = Buffer.isBuffer(body);

    const contentType = isBuffer ? "application/zip" : "application/json";

    const input = {
      Body: body,
      Bucket: bucketName,
      Key: objectKey,
      ContentType: contentType,
      ContentLength: isBuffer
        ? body.length
        : Buffer.byteLength(body),
    };

    const command = new PutObjectCommand(input);
    const response: PutObjectCommandOutput = await s3Client.send(command);
    const httpStatusCode = response?.$metadata?.httpStatusCode;

    if (httpStatusCode !== 200) {
      throw new Error(`HTTP Status Code: ${httpStatusCode}`);
    }

    return SAVE_SUCCESS;
  } catch (error: unknown) {
    console.error({
      message: "Failed to save blob to S3.",
      error,
      objectKey,
    });
    return SAVE_FAILURE;
  }
};

/**
 * Deletes a blob from an AWS S3 bucket.
 * @param objectKey - The name of the blob.
 * @returns An object containing the status and message.
 */
export const deleteFromS3 = async (
  objectKey: string,
): Promise<BlobResponse> => {
  const bucketName = process.env.ECR_BUCKET_NAME;

  try {
    const input = {
      Bucket: bucketName,
      Key: objectKey,
    };
    const command = new DeleteObjectCommand(input);
    const response: DeleteObjectCommandOutput = await s3Client.send(command);
    const httpStatusCode = response?.$metadata?.httpStatusCode;

    // S3 can return 204 on successful deletion
    if (httpStatusCode !== 204 && httpStatusCode !== 200) {
      throw new Error(`HTTP Status Code: ${httpStatusCode}`);
    }

    return DELETE_SUCCESS;
  } catch (error: unknown) {
    console.error({
      message: "Failed to delete blob from S3.",
      error,
      objectKey,
    });
    return DELETE_FAILURE;
  }
};
