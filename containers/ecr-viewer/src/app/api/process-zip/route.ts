import { z } from "zod";

import {
  getOrchestrationResponse,
  postOrchestration,
} from "@/app/api/orchestration-utils";

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
export const POST = postOrchestration(
  schema,
  async (body) =>
    await getOrchestrationResponse("process-zip", {
      data_type: "zip",
      ...body,
    }),
);
