// Adapted from 'next-auth' to work with chained middleware approadh

import { NextRequest, NextResponse } from "next/server";
import withAuth, { NextRequestWithAuth } from "next-auth/middleware";

import { ChainableMiddleware, MiddlewareFactory } from "@/middleware";

/**
 * Middleware for handling next authorization
 * @param next Next middleware in the chain
 * @returns a NextResponse
 */
export const withNextAuth: MiddlewareFactory = (next: ChainableMiddleware) => {
  return async function (request: NextRequest) {
    if (
      !!process.env.NBS_PUB_KEY &&
      request.headers.get("x-nbs-authorized") === "true"
    ) {
      // User already authorized to view this page, skip main auth flow
      return next(request);
    }

    // Auth not actually set up, so show generic 404 instead of signin page
    if (!process.env.AUTH_PROVIDER) {
      const problem =
        request.headers.get("x-nbs-authorized") === "false"
          ? "auth"
          : "notfound";
      return NextResponse.redirect(
        new URL(
          `${process.env.BASE_PATH}/error/${problem}`,
          request.nextUrl.origin,
        ),
      );
    }

    const response = await withAuth(request as NextRequestWithAuth, {
      pages: { signIn: `/signin` },
    });
    if (response instanceof Response) {
      return response as NextResponse;
    } else {
      return next(request);
    }
  };
};
