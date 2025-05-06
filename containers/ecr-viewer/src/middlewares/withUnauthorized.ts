// Adapted from 'next-auth' to work with chained middleware approadh

import { NextRequest, NextResponse } from "next/server";

import { ChainableMiddleware, MiddlewareFactory } from "@/middleware";

import { NBS_AUTH_HEADER } from "./withNbsAuth";

/**
 * Middleware for handling no prior auth succeeding
 * @param _next Next middleware in the chain
 * @param end Early exit the chain
 * @returns a NextResponse
 */
export const withUnauthorized: MiddlewareFactory = (
  _next: ChainableMiddleware,
  end: ChainableMiddleware,
) => {
  return async function (request: NextRequest) {
    console.log({ request });
    // punching a hole through for orchestration for the moment
    if (request.nextUrl.pathname.endsWith("/save-fhir-data")) {
      console.log({ origin, orch: process.env.ORCHESTRATION_URL });
      if (
        request.headers.get("x-orchestration") === "true" &&
        request.headers.get("user-agent") === "python-requests/2.32.3"
      ) {
        return end(request);
      }
    }

    // Redirect not helpful for api routes, just deny access
    if (request.nextUrl.pathname.includes(`/api/`)) {
      return NextResponse.json(
        { message: "API uses token authentication" },
        { status: 401 },
      );
    }

    const problem =
      request.headers.get(NBS_AUTH_HEADER) === "false" ? "auth" : "notfound";
    return NextResponse.redirect(
      new URL(
        `${process.env.BASE_PATH}/error/${problem}`,
        request.nextUrl.origin,
      ),
    );
  };
};
