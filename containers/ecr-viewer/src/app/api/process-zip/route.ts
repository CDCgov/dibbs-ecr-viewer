import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { processZip } from "./service";

const schema = z.object({
  upload_file: z
    .instanceof(File)
    .refine((file) => file.type === "application/zip", {
      message: "File must be a zip",
    }),
});

/**
 * Handles POST requests and saves the FHIR Bundle to the database.
 * @param request - The incoming request object.
 * @returns A `NextResponse` object with a JSON payload indicating the success message.
 */
export async function POST(request: NextRequest) {
  try {
    const body = schema.parse(Object.fromEntries(await request.formData()));
    const { message, status } = await processZip(body.upload_file);
    return NextResponse.json({ message }, { status });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation error", errors: error.errors },
        { status: 400 },
      );
    }
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
