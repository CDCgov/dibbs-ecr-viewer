import { NextRequest, NextResponse } from "next/server";

import { ChainableProxy, ProxyFactory } from "@/proxy";

/**
 * Rewrites a request to `process-zip` to `process-ecr` so that Next routes
 * it as if was made to `process-ecr` instead.
 * @param next The next proxy to call
 * @returns proxy function
 */
export const withProcessZipRewrite: ProxyFactory = (
  next: ChainableProxy,
) => {
  return async function (request: NextRequest) {
    const url = request.nextUrl.toString();
    if (url.endsWith("/api/process-zip")) {
      console.warn(
        "The `process-zip` API has been deprecated. Use `process-ecr` instead.",
      );
      return NextResponse.rewrite(url.replace("zip", "ecr"));
    } else {
      return next(request);
    }
  };
};
