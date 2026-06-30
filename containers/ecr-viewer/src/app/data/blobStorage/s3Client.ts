import {
  DeleteObjectCommand,
  DeleteObjectCommandOutput,
  HeadBucketCommand,
  HeadObjectCommand,
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
 * Checks whether an object exists in an AWS S3 bucket.
 * @param objectKey - The name of the blob.
 * @returns True if the object exists, false otherwise.
 */
export const existsInS3 = async (objectKey: string): Promise<boolean> => {
  try {
    // HeadObjectCommand checks for existence and gets the file's metadata
    // without downloading its contents, unlike GetObjectCommand which
    // would stream the full file. send() throws on any non-2xx response,
    // so a clean resolve means the object exists.
    await s3Client.send(
      new HeadObjectCommand({
        Bucket: process.env.ECR_BUCKET_NAME,
        Key: objectKey,
      }),
    );
    return true;
  } catch (error: unknown) {
    // Unlike GCP/Azure, s3Client is always built, misconfiguration are
    // thrown rather than an undefined client. A 404 means the
    // object doesn't exist; rethrow anything else so callers aren't misled into
    // treating a storage error as a non-duplicate.
    if (
      error instanceof Error &&
      (error as { $metadata?: { httpStatusCode?: number } }).$metadata
        ?.httpStatusCode === 404
    ) {
      return false;
    }
    throw error;
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
      ContentLength: isBuffer ? body.length : Buffer.byteLength(body),
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
