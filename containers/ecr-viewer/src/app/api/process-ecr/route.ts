import { z } from "zod";

import { postOrchestration } from "@/app/api/services/orchestrationRouteService";

const schema = z.object({
  ecr: z.union([z.string(), z.instanceof(File)]),
  rr: z.union([z.string(), z.instanceof(File)]).optional(),
});

const asString = async (v: string | File | undefined) =>
  v instanceof File ? await v.text() : v;

/**
 * Handles POST requests and saves the FHIR Bundle to the database.
 * @param request - The incoming request object.
 * @returns A `NextResponse` object with a JSON payload indicating the success message.
 */
export const POST = postOrchestration(schema, async ({ ecr, rr }) => {
  if (ecr instanceof File && ecr.type === "application/zip") {
    return [{ upload_file: ecr }, "process-zip", "zip"];
  } else {
    const message = await asString(ecr);
    const rr_data = await asString(rr);
    return [{ message, rr_data }, "process-message", "ecr"];
  }
});
