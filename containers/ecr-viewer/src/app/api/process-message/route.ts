import { z } from "zod";

import {
  getOrchestrationResponse,
  postOrchestration,
} from "@/app/api/orchestration-utils";

const schema = z.object({
  message: z.string(),
  rr_data: z.string().optional(),
});

/**
 * Handles POST requests and saves the FHIR Bundle to the database.
 * @param request - The incoming request object.
 * @returns A `NextResponse` object with a JSON payload indicating the success message.
 */
export const POST = postOrchestration(
  schema,
  async (body) =>
    await getOrchestrationResponse("process-message", {
      data_type: "ecr",
      ...body,
    }),
);
