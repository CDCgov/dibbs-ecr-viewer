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
  if (process.env.NBS_AUTH === "true") return next;

  return async function (request: NextRequest) {
    const response = await withAuth(request as NextRequestWithAuth);
    if (response instanceof Response) {
      return response as NextResponse;
    } else {
      return next(request);
    }
  };
};
