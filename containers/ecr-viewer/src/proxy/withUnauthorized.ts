// Adapted from 'next-auth' to work with chained proxy approach

import { NextRequest, NextResponse } from "next/server";

import { ChainableProxy, ProxyFactory } from "@/proxy";

import { JWT_AUTH_HEADER } from "./withJwtAuth";

/**
 * Proxy for handling no prior auth succeeding
 * @param _next Next proxy in the chain
 * @param end Early exit the chain
 * @returns a NextResponse
 */
export const withUnauthorized: ProxyFactory = (
  _next: ChainableProxy,
  end: ChainableProxy,
) => {
  return async function (request: NextRequest) {
    // Redirect not helpful for api routes, just deny access
    if (request.nextUrl.pathname.includes(`/api/`)) {
      return NextResponse.json(
        { message: "API uses token authentication" },
        { status: 401 },
      );
    }

    const problem =
      request.headers.get(JWT_AUTH_HEADER) === "false" ? "auth" : "notfound";
    return NextResponse.redirect(
      new URL(
        `${process.env.BASE_PATH}/error/${problem}`,
        request.nextUrl.origin,
      ),
    );
  };
};
