import { NextResponse } from "next/server";

import { azureBlobStorageHealthCheck } from "@/app/data/blobStorage/azureClient";
import { s3HealthCheck } from "@/app/data/blobStorage/s3Client";
import { postgresHealthCheck } from "@/app/data/db/postgres_db";
import { sqlServerHealthCheck } from "@/app/data/db/sqlserver_db";

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
        sqlserver: await sqlServerHealthCheck(),
        postgres: await postgresHealthCheck(),
        s3: await s3HealthCheck(),
        azureBlobStorage: await azureBlobStorageHealthCheck(),
      },
    },
    { status: 200 },
  );
}
