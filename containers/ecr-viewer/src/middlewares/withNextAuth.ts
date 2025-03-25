// Adapted from 'next-auth' to work with chained middleware approadh

import { NextRequest, NextResponse } from "next/server";
import withAuth, { NextRequestWithAuth } from "next-auth/middleware";

import { providerMap } from "@/app/api/auth/auth";
import { ChainableMiddleware, MiddlewareFactory } from "@/middleware";

/**
 * Middleware for handling next authorization
 * @param next Next middleware in the chain
 * @returns a NextResponse
 */
export const withNextAuth: MiddlewareFactory = (next: ChainableMiddleware) => {
  return async function (request: NextRequest) {
    if (process.env.NBS_AUTH === "true") {
      if (request.headers.get("x-nbs-authorized") === "true") {
        // User already authorized to view this page, skip main auth flow
        return next(request);
      } else if (providerMap.length === 0) {
        // Auth not actually set up, so show generic 404 instead of signin page
        return NextResponse.rewrite(
          new URL(
            `${process.env.BASE_PATH}/error/notfound`,
            request.nextUrl.origin,
          ),
          { request },
        );
      }
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
