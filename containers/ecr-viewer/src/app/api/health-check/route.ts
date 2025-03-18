import { NextResponse } from "next/server";

import { metadataDatabaseHealthCheck } from "@/app/api/services/database";
import { azureBlobStorageHealthCheck } from "@/app/data/blobStorage/azureClient";
import { s3HealthCheck } from "@/app/data/blobStorage/s3Client";

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
      },
    },
    { status: 200 },
  );
}
