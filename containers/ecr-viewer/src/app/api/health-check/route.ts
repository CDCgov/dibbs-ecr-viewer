import { NextResponse } from "next/server";

import { azureBlobStorageHealthCheck } from "@/app/data/blobStorage/azureClient";
import { s3HealthCheck } from "@/app/data/blobStorage/s3Client";
import { postgresHealthCheck } from "@/app/data/db/postgres_db";
import { sqlServerHealthCheck } from "@/app/data/db/sqlserver_db";

/**
 * Health check for ECR Viwer
 * @returns Response with status OK.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "OK",
      version: process.env.VERSION,
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
