import { NextResponse } from "next/server";

import { metadataDatabaseHealthCheck } from "@/app/api/services/database";
import { azureBlobStorageHealthCheck } from "@/app/data/blobStorage/azureClient";
import { gcpHealthCheck } from "@/app/data/blobStorage/gcpClient";
import { s3HealthCheck } from "@/app/data/blobStorage/s3Client";

export const revalidate = 10;

/**
 * Health check for ECR Viwer
 * @returns Response with status OK.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "UP",
      version: process.env.APP_VERSION,
      dependencies: {
        metadataDb: await metadataDatabaseHealthCheck(),
        s3: await s3HealthCheck(),
        azureBlobStorage: await azureBlobStorageHealthCheck(),
        gcp: await gcpHealthCheck(),
      },
    },
    { status: 200 },
  );
}
