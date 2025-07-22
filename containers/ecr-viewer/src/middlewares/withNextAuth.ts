// Adapted from 'next-auth' to work with chained middleware approach

import { NextRequest, NextResponse } from "next/server";
import withAuth, { NextRequestWithAuth } from "next-auth/middleware";

import { ChainableMiddleware, MiddlewareFactory } from "@/middleware";

/**
 * Middleware for handling next authorization
 * @param next Next middleware in the chain
 * @param end Early exit the chain
 * @returns a NextResponse
 */
export const withNextAuth: MiddlewareFactory = (
  next: ChainableMiddleware,
  end: ChainableMiddleware,
) => {
  return async function (request: NextRequest) {
    // IDP Auth not actually set up, so bail out
    if (!process.env.AUTH_PROVIDER) {
      return next(request);
    }

    const response = await withAuth(request as NextRequestWithAuth, {
      pages: { signIn: `/signin` },
    });
    if (response instanceof Response) {
      // Redirect not helpful for api routes, pass on to unauthorized handler
      if (request.nextUrl.pathname.includes(`/api/`)) {
        return next(request);
      }

      return response as NextResponse;
    } else {
      return end(request);
    }
  };
};
