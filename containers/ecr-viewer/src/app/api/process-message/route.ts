import { z } from "zod";

import { postOrchestration } from "@/app/api/services/orchestrationRouteService";

const schema = z.object({
  message: z.string(),
  rr_data: z.string().optional(),
});

/**
 * Handles POST requests and saves the FHIR Bundle to the database.
 * @param request - The incoming request object.
 * @returns A `NextResponse` object with a JSON payload indicating the success message.
 */
export const POST = postOrchestration("process-message", "ecr", schema);
