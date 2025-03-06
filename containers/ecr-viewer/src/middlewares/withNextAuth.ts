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
    if (process.env.NBS_AUTH === "true") return next(request);

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
