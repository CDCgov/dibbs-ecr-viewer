import { Bundle, FhirResource } from "fhir/r4";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  getOrchestrationResponse,
  orchestrationRequest,
} from "./orchestrationService";

export interface ProcessOrchestrationResponse {
  message: string;
  erorors?: string[];
  bundle?: Bundle<FhirResource>;
}

/**
 * @param endpoint orchestration end point to use
 * @param data_type orchestration `data_type` of the request
 * @param routeSchema Zod schema to parse the request's body
 * @returns POST handler for an orchestration processing route
 */
export const postOrchestration =
  <T extends z.ZodRawShape, Schema extends z.ZodObject<T>>(
    endpoint: string,
    data_type: string,
    routeSchema: Schema,
  ) =>
  async (
    request: NextRequest,
  ): Promise<NextResponse<ProcessOrchestrationResponse>> => {
    // Parse out the form from the request
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { message: "Validation error", errors: ["No form found"] },
        { status: 400 },
      );
    }

    try {
      const schema = routeSchema.extend({
        return_fhir_bundle: z
          .string()
          .optional()
          .transform((v) => v?.toLowerCase()),
      });
      const { return_fhir_bundle, ...body } = schema.parse(
        Object.fromEntries(formData),
      );
      const resp = getOrchestrationResponse(endpoint, { data_type, ...body });
      const { status, ...payload } = await orchestrationRequest(
        resp,
        return_fhir_bundle === "true",
      );
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

      console.error(error);
      return NextResponse.json(
        { message: "Internal Server Error" },
        { status: 500 },
      );
    }
  };
