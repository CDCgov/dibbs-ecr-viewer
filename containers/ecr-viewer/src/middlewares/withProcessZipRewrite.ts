import { NextRequest, NextResponse } from "next/server";

import { ChainableMiddleware, MiddlewareFactory } from "@/middleware";

// This is currently hard coded on the library search params, but could be made configurable
// with a matcher down the road.

/**
 * Checks that all URL params are valid and deletes them and redirects the url if not.
 * Note, we only check params that we expect and have validators for, all others will
 * pass through unchanged.
 * @param next The next middleware to call
 * @returns middleware function
 */
export const withProcessZipRewrite: MiddlewareFactory = (
  next: ChainableMiddleware,
) => {
  return async function (request: NextRequest) {
    const url = request.nextUrl.toString();
    console.log({ url });
    if (url.endsWith("/api/process-zip")) {
      return NextResponse.rewrite(url.replace("zip", "ecr"));
    } else {
      return next(request);
    }
  };
};
