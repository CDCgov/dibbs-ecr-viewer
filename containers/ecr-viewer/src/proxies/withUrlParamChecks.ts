import { NextRequest, NextResponse } from "next/server";

import { LIBRARY_SEARCH_PARAMS } from "@/app/utils/search-param-utils";
import { ChainableProxy, ProxyFactory } from "@/proxy";

// This is currently hard coded on the library search params, but could be made configurable
// with a matcher down the road.

/**
 * Checks that all URL params are valid and deletes them and redirects the url if not.
 * Note, we only check params that we expect and have validators for, all others will
 * pass through unchanged.
 * @param next The next proxy to call
 * @returns proxy function
 */
export const withUrlParamChecks: ProxyFactory = (next: ChainableProxy) => {
  return async function (request: NextRequest) {
    const url = request.nextUrl.clone();
    for (const [param, spec] of Object.entries(LIBRARY_SEARCH_PARAMS)) {
      if (url.searchParams.has(param)) {
        // We never expect a param to be specified multiple times, delete later entries
        const paramVals = url.searchParams.getAll(param);
        if (paramVals.length > 1) {
          paramVals.slice(1).forEach((val) => {
            url.searchParams.delete(param, val);
          });
        }

        // Check param's validation function
        spec.validator?.(url.searchParams);
      }
    }

    if (
      url.searchParams.toString() !== request.nextUrl.searchParams.toString()
    ) {
      return NextResponse.redirect(url);
    } else {
      return next(request);
    }
  };
};
