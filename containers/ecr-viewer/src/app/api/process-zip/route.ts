import { Bundle, FhirResource } from "fhir/r4";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { processZip } from "./service";

const schema = z.object({
  upload_file: z
    .instanceof(File)
    .refine((file) => file.type === "application/zip", {
      message: "File must be a zip",
    }),
  return_fhir_bundle: z
    .string()
    .optional()
    .transform((v) => v?.toLowerCase()),
});

interface ProcessZipResponse {
  message: string;
  erorors?: string[];
  bundle?: Bundle<FhirResource>;
}

/**
 * Handles POST requests and saves the FHIR Bundle to the database.
 * @param request - The incoming request object.
 * @returns A `NextResponse` object with a JSON payload indicating the success message.
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<ProcessZipResponse>> {
  // Parse out the form from the request
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { message: "Validation error", errors: ["No form found"] },
      { status: 400 },
    );
  }

  try {
    const body = schema.parse(Object.fromEntries(formData));
    const { status, ...payload } = await processZip(
      body.upload_file,
      body.return_fhir_bundle === "true",
    );
    return NextResponse.json(payload, { status });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          message: "Validation error",
          errors: error.errors,
        },
        { status: 400 },
      );
    }

    console.error(error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
