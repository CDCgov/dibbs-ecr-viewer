import { z } from "zod";

import { postOrchestration } from "@/app/api/services/orchestrationRouteService";

const schema = z.object({
  ecr: z.union([
    z
      .string()
      .refine((val) => !!val.match(/<.*>.*<\/.*>/), "eCR must contain XML"),
    z.instanceof(File),
  ]),
  rr: z
    .union([
      z
        .string()
        .refine((val) => !!val.match(/<.*>.*<\/.*>/), "RR must contain XML"),
      z.instanceof(File),
    ])
    .optional(),
});

/**
 * Handles POST requests and saves the FHIR Bundle to the database.
 * @param request - The incoming request object.
 * @returns A `NextResponse` object with a JSON payload indicating the success message.
 */
export const POST = postOrchestration(schema, ({ ecr }) => {
  if (ecr instanceof File && ecr.type === "application/zip") {
    return ["process-zip", "zip"];
  } else {
    return ["process-message", "ecr"];
  }
});
