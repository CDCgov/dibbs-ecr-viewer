import { NextRequest, NextResponse } from "next/server";

import { withNbsAuth } from "./middlewares/withNbsAuth";
import { withNextAuth } from "./middlewares/withNextAuth";
import { withUrlParamChecks } from "./middlewares/withUrlParamChecks";

// https://reacthustle.com/blog/how-to-chain-multiple-middleware-functions-in-nextjs
// https://github.com/jmarioste/next-middleware-guide/

export type ChainableMiddleware = (
  request: NextRequest,
) => Promise<NextResponse>;

export type MiddlewareFactory = (
  middleware: ChainableMiddleware,
) => ChainableMiddleware;

/**
 * Helper to compose multiple MiddlewareFactory instances together.
 *
 * We restrict the type of middleware to ChainableMiddleware, which is a strict
 * subset of the full NextMiddleware type.  Specifically, we require middleware
 * layers to return Promise<NextResponse>, as opposed to a few other return
 * types that NextMiddleware allows in general.  This restriction allows
 * middleware layers that want to set response cookies to do so using the
 * NextResponse cookies api: each layer reliably receives a NextResponse from
 * the next layer in the chain, and can add cookies to it before passing it on
 * down.
 *
 * Important: layers must construct NextResponses (specifically the .next() and
 * .rewrite() variants) by passing in the (possibly mutated) request object.
 * Then any headers/cookies that have been set on the request object (including
 * by earlier layers) will be properly passed on to the Next.js request
 * handlers: page components, server actions and route handlers.
 * @param functions - Middleware functions to run
 * @param index - driver of walking the chain - only used internally
 * @returns chain of middleware
 */
export const chainMiddleware = (
  functions: MiddlewareFactory[] = [],
  index = 0,
): ChainableMiddleware => {
  const current = functions[index];
  if (current) {
    const next = chainMiddleware(functions, index + 1);
    return current(next);
  }

  return async (request) => NextResponse.next({ request });
};

/**
 * Composed middleware handlers
 */
export default chainMiddleware([withNbsAuth, withNextAuth, withUrlParamChecks]);

export const config = {
  matcher: [
    /*
     * Run middleware on all request paths except these:
     * - Api routes
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - images (static files in public/images/ directory)
     */
    "/((?!api|_next/static|_next/image|public|img|uswds|images).*)",
    /**
     * Fix issue where the pattern above was causing middleware
     * to not run on the homepage:
     */
    "/",
    /**
     * Run middleware on getting fhir-data
     */
    "/api/fhir-data",
  ],
};
