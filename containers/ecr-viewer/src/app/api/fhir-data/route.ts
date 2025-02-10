import { NextRequest } from "next/server";
import { get_fhir_data } from "./fhir-data-service";

/**
 * Handles GET requests by fetching data from different sources based on the environment configuration.
 * It supports fetching from S3 and Azure blob storage dependent on the SOURCE environment variable.
 * @param request - The incoming request object provided by Next.js.
 * @returns A promise that resolves to a `NextResponse` with fhirBundle and fhirPathMappings
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const ecr_id = params.get("id") || null;
  return get_fhir_data(ecr_id);
}
