import { Bundle, FhirResource } from "fhir/r4";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { deleteFromStorage } from "@/app/api/save-fhir-data/service";

import {
  orchestrationRequest,
  getEcrIdFromXml,
  zipAndSaveXml,
} from "./service";

interface ProcessEcrResponse {
  message: string;
  erorors?: string[];
  bundle?: Bundle<FhirResource>;
}

// Partial for returning the fhir bundle, used in both schema
const returnBundle = {
  return_fhir_bundle: z.coerce
    .string()
    .optional()
    .transform((v) => v?.toLowerCase()),
};

const schema = z.object({
  ecr: z.union([z.string(), z.instanceof(File)]),
  rr: z.union([z.string(), z.instanceof(File)]).optional(),
  ...returnBundle,
});

const processZipSchema = z
  .object({
    upload_file: z
      .instanceof(File)
      .refine(
        (file) =>
          file.type === "application/zip" ||
          file.type === "application/octet-stream",
        {
          message: "File must be a zip",
        },
      ),
    ...returnBundle,
  })
  .transform((input) => ({
    ...input,
    ecr: input.upload_file,
  }));

/**
 * Handles POST requests and saves the FHIR Bundle to the database.
 * @param request - The incoming request object.
 * @returns A `NextResponse` object with a JSON payload indicating the success message.
 */
export const POST = async (
  request: NextRequest,
): Promise<NextResponse<ProcessEcrResponse>> => {
  // Parse out the form from the request
  let rawBody: object;
  let ecrId: string | undefined = undefined;
  try {
    const contentType = request.headers.get("content-type");
    if (contentType?.includes("form-")) {
      rawBody = Object.fromEntries(await request.formData());
    } else {
      rawBody = await request.json();
    }
  } catch {
    return NextResponse.json(
      { message: "Validation error", errors: ["No form or json body found"] },
      { status: 400 },
    );
  }

  // Got here via the withProcessZipRewrite middleware
  const routeSchema = request.url.endsWith("process-zip")
    ? processZipSchema
    : schema;

  try {
    const { return_fhir_bundle, ...body } = routeSchema.parse(rawBody);
    const promises: [
      Promise<{
        message: string;
        status: number;
        bundle?: Bundle<FhirResource>;
      }>,
      Promise<void>?,
    ] = [orchestrationRequest(body, return_fhir_bundle === "true")];

    if (process.env.SAVE_XML) {
      ecrId = await getEcrIdFromXml(body);
      promises.push(zipAndSaveXml(body, ecrId));
    }

    const [orchestrationResult, saveResult] =
      await Promise.allSettled(promises);

    if (
      orchestrationResult.status === "rejected" ||
      orchestrationResult.value.status >= 500
    ) {
      if (process.env.SAVE_XML && ecrId && saveResult!.status === "fulfilled") {
        await deleteFromStorage(ecrId, process.env.SOURCE, "xml");
      }

      const errMsg =
        orchestrationResult.status === "rejected"
          ? String(orchestrationResult.reason)
          : orchestrationResult.value.message;
      return NextResponse.json({ message: errMsg }, { status: 500 });
    }

    const { status, ...payload } = orchestrationResult.value;
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

    console.error("Internal Server Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
};
