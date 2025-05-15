import { NextRequest, NextResponse } from "next/server";

import { ChainableMiddleware, MiddlewareFactory } from "@/middleware";

/**
 * Rewrites a request to `process-zip` to `process-ecr` so that Next routes
 * it as if was made to `process-ecr` instead.
 * @param next The next middleware to call
 * @returns middleware function
 */
export const withProcessZipRewrite: MiddlewareFactory = (
  next: ChainableMiddleware,
) => {
  return async function (request: NextRequest) {
    const url = request.nextUrl.toString();
    if (url.endsWith("/api/process-zip")) {
      return NextResponse.rewrite(url.replace("zip", "ecr"));
    } else {
      return next(request);
    }
  };
};
