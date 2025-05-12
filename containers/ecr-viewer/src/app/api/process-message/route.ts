import { z } from "zod";

import { postOrchestration } from "@/app/api/orchestration-utils";

import { processMessage } from "./service";

const schema = z.object({
  message: z.string(),
  rr_data: z.string().optional(),
  return_fhir_bundle: z
    .string()
    .optional()
    .transform((v) => v?.toLowerCase()),
});

/**
 * Handles POST requests and saves the FHIR Bundle to the database.
 * @param request - The incoming request object.
 * @returns A `NextResponse` object with a JSON payload indicating the success message.
 */
export const POST = postOrchestration(async (formData: FormData) => {
  const body = schema.parse(Object.fromEntries(formData));
  return await processMessage(
    body.message,
    body.rr_data,
    body.return_fhir_bundle === "true",
  );
});
