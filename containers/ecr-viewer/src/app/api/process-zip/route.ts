import { z } from "zod";

import { postOrchestration } from "@/app/api/orchestration-utils";

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

/**
 * Handles POST requests and saves the FHIR Bundle to the database.
 * @param request - The incoming request object.
 * @returns A `NextResponse` object with a JSON payload indicating the success message.
 */
export const POST = postOrchestration(async (formData: FormData) => {
  const body = schema.parse(Object.fromEntries(formData));
  return await processZip(body.upload_file, body.return_fhir_bundle === "true");
});
// export async function POST(
//   request: NextRequest,
// ): Promise<NextResponse<ProcessOrchestrationResponse>> {
//   return await postOrchestration(request, async (formData: FormData) => {
//     const body = schema.parse(Object.fromEntries(formData));
//     return await processZip(
//       body.upload_file,
//       body.return_fhir_bundle === "true",
//     );
//   });
// }
