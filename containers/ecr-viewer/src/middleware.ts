import { NextRequest, NextResponse } from "next/server";

import { withApiTokenAuth } from "./middlewares/withApiTokenAuth";
import { withNbsAuth } from "./middlewares/withNbsAuth";
import { withNextAuth } from "./middlewares/withNextAuth";
import { withProcessZipRewrite } from "./middlewares/withProcessZipRewrite";
import { withUnauthorized } from "./middlewares/withUnauthorized";
import { withUrlParamChecks } from "./middlewares/withUrlParamChecks";

// https://reacthustle.com/blog/how-to-chain-multiple-middleware-functions-in-nextjs
// https://github.com/jmarioste/next-middleware-guide/

export type ChainableMiddleware = (
  request: NextRequest,
) => Promise<NextResponse>;

export type MiddlewareFactory = (
  next: ChainableMiddleware,
  end: ChainableMiddleware,
) => ChainableMiddleware;

// Function to exit all middleware processing with a successful continuation
// of the request
const exitMiddleware: ChainableMiddleware = async (request: NextRequest) =>
  NextResponse.next({ request });

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
 * @param endFn - Middware function run at the end of the chain
 * @param index - driver of walking the chain - only used internally
 * @returns chain of middleware
 */
export const chainMiddleware = (
  functions: MiddlewareFactory[] = [],
  endFn: ChainableMiddleware = exitMiddleware,
  index = 0,
): ChainableMiddleware => {
  const current = functions[index];
  if (current) {
    const next = chainMiddleware(functions, endFn, index + 1);
    return current(next, endFn);
  }

  return endFn;
};

// Sub-chain for auth, which early exits back to the main chain
const authMiddleware: MiddlewareFactory = (next: ChainableMiddleware, _endFn) =>
  chainMiddleware(
    [withNbsAuth, withApiTokenAuth, withNextAuth, withUnauthorized],
    next,
  );

/**
 * Composed middleware handlers
 */
export default chainMiddleware([
  authMiddleware,
  withProcessZipRewrite,
  withUrlParamChecks,
]);

export const config = {
  matcher: [
    /*
     * Run middleware on all request paths except these:
     * - Public API routes
     * - Error pages
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - images (static files in public/images/ directory)
     */
    "/((?!api/health-check|api/auth|error|_next/static|_next/image|public|img|uswds|images).*)",
    /**
     * Fix issue where the pattern above was causing middleware
     * to not run on the homepage:
     */
    "/",
  ],
};
