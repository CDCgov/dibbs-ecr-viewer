import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const MessageTypeEnum = z.enum(["ecr", "elr", "vxu", "fhir"]);
const DataTypeEnum = z.enum([`ecr`, `zip`, `fhir`, `hl7`]);
const ConfigFileEnum = z.enum([""]);

const schema = z.object({
  message_type: MessageTypeEnum, // Do we still need this one, should we just support ecr?
  data_type: DataTypeEnum, // Should we  just allow zip?
  config_file_name: ConfigFileEnum,
  upload_file: z
    .instanceof(File)
    .refine((file) => file.type === "application/zip", {
      message: "File must be a zip",
    }),
});

/**
 * POST function for process-zip endpoint
 * @param request -
 * @returns nothing yet
 */
export async function POST(request: NextRequest) {
  try {
    const _body = schema.parse(Object.fromEntries(await request.formData()));
    return NextResponse.json({ detail: "ok" }, { status: 200 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { detail: "Validation error", errors: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json({ detail: "Server error" }, { status: 500 });
  }
}
