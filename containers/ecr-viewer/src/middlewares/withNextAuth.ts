// Adapted from 'next-auth' to work with chained middleware approadh

import { NextRequest, NextResponse } from "next/server";
import withAuth, { NextRequestWithAuth } from "next-auth/middleware";

import { isProviderConfigured } from "@/app/api/auth/auth";
import { ChainableMiddleware, MiddlewareFactory } from "@/middleware";

/**
 * Middleware for handling next authorization
 * @param next Next middleware in the chain
 * @returns a NextResponse
 */
export const withNextAuth: MiddlewareFactory = (next: ChainableMiddleware) => {
  return async function (request: NextRequest) {
    if (
      process.env.NBS_AUTH === "true" &&
      request.headers.get("x-nbs-authorized") === "true"
    ) {
      // User already authorized to view this page, skip main auth flow
      return next(request);
    }

    // Auth not actually set up, so show generic 404 instead of signin page
    if (!isProviderConfigured()) {
      return NextResponse.redirect(
        new URL(
          `${process.env.BASE_PATH}/error/notfound`,
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
