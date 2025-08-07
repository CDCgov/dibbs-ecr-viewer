import { GetObjectCommand, S3ServiceException } from "@aws-sdk/client-s3";
import { BlobClient, BlobDownloadResponseParsed } from "@azure/storage-blob";
import { ApiError } from "@google-cloud/storage";
import { Bundle } from "fhir/r4";

import { azureBlobContainerClient } from "@/app/data/blobStorage/azureClient";
import { gcpClient } from "@/app/data/blobStorage/gcpClient";
import { s3Client } from "@/app/data/blobStorage/s3Client";
import {
  AZURE_SOURCE,
  GCP_SOURCE,
  S3_SOURCE,
  streamToJson,
} from "@/app/data/blobStorage/utils";
import { audit } from "@/app/services/auditLogService";

const UNKNOWN_ECR_ID = "eCR ID not found";

interface Response {
  status: number;
  payload: object;
}
interface SuccessResponse extends Response {
  status: 200;
  payload: { fhirBundle: Bundle };
}
interface ErrorResponse extends Response {
  payload: { message: string };
}

type FhirDataResponse = SuccessResponse | ErrorResponse;

/**
 * Determine if this is a success response from the fhir service
 * @param resp the response to check
 * @returns whether it is successful
 */
export const isSuccessResponse = (resp: Response): resp is SuccessResponse =>
  resp.status === 200;

/**
 * Get the fhir data for a given eCR ID
 * @param eicr_id The id of the eICR to fetch
 * @returns NextResponse with the eCR or error data
 */
export const getFhirData = audit(
  "ecr",
  "view",
  async ({ eicr_id }: { eicr_id: string | null }) => {
    if (process.env.SOURCE === S3_SOURCE) {
      return await getS3(eicr_id);
    } else if (process.env.SOURCE === AZURE_SOURCE) {
      return await getAzure(eicr_id);
    } else if (process.env.SOURCE === GCP_SOURCE) {
      return await getGcp(eicr_id);
    } else {
      return { payload: { message: "Invalid source" }, status: 500 };
    }
  },
);

/**
 * Retrieves FHIR data from S3 based on eCR ID.
 * @param ecr_id - The id of the ecr to fetch.
 * @returns A promise resolving to a NextResponse object.
 */
export const getS3 = async (
  ecr_id: string | null,
): Promise<FhirDataResponse> => {
  const bucketName = process.env.ECR_BUCKET_NAME;
  const objectKey = `${ecr_id}.json`;

  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
    });

    const { Body } = await s3Client.send(command);
    const fhirBundle = await streamToJson(Body);

    return { payload: { fhirBundle }, status: 200 };
  } catch (error: unknown) {
    console.error("S3 GetObject error:", error);

    if (error instanceof S3ServiceException && error.name === "NoSuchKey") {
      return { payload: { message: UNKNOWN_ECR_ID }, status: 404 };
    }

    if (error instanceof Error) {
      return { payload: { message: error.message }, status: 500 };
    }

    return { payload: { message: "Internal Server Error." }, status: 500 };
  }
};

/**
 * Retrieves FHIR data from Azure Blob Storage based on eCR ID.
 * @param ecr_id - The id of the ecr to fetch.
 * @returns A promise resolving to a NextResponse object.
 */
export const getAzure = async (
  ecr_id: string | null,
): Promise<FhirDataResponse> => {
  const containerClient = azureBlobContainerClient();
  const blobName = `${ecr_id}.json`;

  if (!containerClient) {
    return {
      payload: {
        message:
          "Failed to download the FHIR data due to misconfiguration of client.",
      },
      status: 500,
    };
  }
  try {
    const blockBlobClient: BlobClient = containerClient.getBlobClient(blobName);

    const downloadResponse: BlobDownloadResponseParsed =
      await blockBlobClient.download();
    const fhirBundle = await streamToJson(downloadResponse.readableStreamBody);

    return {
      payload: { fhirBundle },
      status: 200,
    };

    // The Azure SDK doesn't export its exception types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error(
      "Failed to download the FHIR data from Azure Blob Storage:",
      error,
    );
    if (error?.statusCode === 404) {
      return { payload: { message: UNKNOWN_ECR_ID }, status: 404 };
    } else {
      return { payload: { message: error.message }, status: 500 };
    }
  }
};

/**
 * Retrieves FHIR data from Google Cloud storage based on eCR ID.
 * @param ecr_id - The id of the ecr to fetch.
 * @returns A promise resolving to a FhirDataResponse object.
 */
const getGcp = async (ecr_id: string | null): Promise<FhirDataResponse> => {
  const client = gcpClient();
  const blobName = `${ecr_id}.json`;

  if (!client) {
    return {
      payload: {
        message: "Failed to download the FHIR data due to misconfiguration.",
      },
      status: 500,
    };
  }
  try {
    const contents = await client.file(blobName).download();
    const fhirBundle = await streamToJson(contents);

    return {
      payload: { fhirBundle },
      status: 200,
    };
  } catch (error: unknown) {
    console.error(
      "Failed to download the FHIR data from Google Cloud Storage:",
      error,
    );

    if (error instanceof ApiError && error.code === 404) {
      return { payload: { message: UNKNOWN_ECR_ID }, status: 404 };
    }

    if (error instanceof Error) {
      return { payload: { message: error.message }, status: 500 };
    }

    return { payload: { message: "Internal Server Error." }, status: 500 };
  }
};
