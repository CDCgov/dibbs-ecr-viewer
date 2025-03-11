import { NextRequest, NextResponse } from "next/server";

import { LIBRARY_SEARCH_PARAMS } from "@/app/utils/search-param-utils";
import { ChainableMiddleware, MiddlewareFactory } from "@/middleware";

// This is currently hard coded on the library search params, but could be made configurable
// with a matcher down the road.

/**
 * Checks that all URL params are valid and deletes them and redirects the url if not.
 * @param next The next middleware to call
 * @returns middleware function
 */
export const withUrlParamChecks: MiddlewareFactory = (
  next: ChainableMiddleware,
) => {
  return async function (request: NextRequest) {
    const url = request.nextUrl.clone();
    let changed = false;
    for (const [param, spec] of Object.entries(LIBRARY_SEARCH_PARAMS)) {
      if (url.searchParams.has(param)) {
        // We never expect a param to be specified multiple times, delete later entries
        const paramVals = url.searchParams.getAll(param);
        if (paramVals.length > 1) {
          paramVals.slice(1).forEach((val) => {
            url.searchParams.delete(param, val);
          });
          changed = true;
        }

        // Check param's validation function
        const toDelete = spec.validator?.(url.searchParams) ?? [];
        toDelete.forEach((p) => {
          url.searchParams.delete(p);
          changed = true;
        });
      }
    }

    if (changed) {
      return NextResponse.redirect(url);
    } else {
      return next(request);
    }
  };
};
