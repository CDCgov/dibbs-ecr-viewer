import { NextRequest, NextResponse } from "next/server";

import { withApiTokenAuth } from "./proxies/withApiTokenAuth";
import { withNbsAuth } from "./proxies/withNbsAuth";
import { withNextAuth } from "./proxies/withNextAuth";
import { withProcessZipRewrite } from "./proxies/withProcessZipRewrite";
import { withUnauthorized } from "./proxies/withUnauthorized";
import { withUrlParamChecks } from "./proxies/withUrlParamChecks";

// https://reacthustle.com/blog/how-to-chain-multiple-middleware-functions-in-nextjs
// https://github.com/jmarioste/next-middleware-guide/

export type ChainableProxy = (request: NextRequest) => Promise<NextResponse>;

export type ProxyFactory = (
  next: ChainableProxy,
  end: ChainableProxy,
) => ChainableProxy;

// Function to exit all proxy processing with a successful continuation
// of the request
const exitProxy: ChainableProxy = async (request: NextRequest) =>
  NextResponse.next({ request });

/**
 * Helper to compose multiple ProxyFactory instances together.
 *
 * We restrict the type of proxy to ChainableProxy, which is a strict
 * subset of the full NextProxy type.  Specifically, we require proxy
 * layers to return Promise<NextResponse>, as opposed to a few other return
 * types that NextProxy allows in general.  This restriction allows
 * proxy layers that want to set response cookies to do so using the
 * NextResponse cookies api: each layer reliably receives a NextResponse from
 * the next layer in the chain, and can add cookies to it before passing it on
 * down.
 *
 * Important: layers must construct NextResponses (specifically the .next() and
 * .rewrite() variants) by passing in the (possibly mutated) request object.
 * Then any headers/cookies that have been set on the request object (including
 * by earlier layers) will be properly passed on to the Next.js request
 * handlers: page components, server actions and route handlers.
 * @param functions - Proxy functions to run
 * @param endFn - Proxy function run at the end of the chain
 * @param index - driver of walking the chain - only used internally
 * @returns chain of proxy
 */
export const chainProxy = (
  functions: ProxyFactory[] = [],
  endFn: ChainableProxy = exitProxy,
  index = 0,
): ChainableProxy => {
  const current = functions[index];
  if (current) {
    const next = chainProxy(functions, endFn, index + 1);
    return current(next, endFn);
  }

  return endFn;
};

// Sub-chain for auth, which early exits back to the main chain
const authProxy: ProxyFactory = (next: ChainableProxy, _endFn) =>
  chainProxy(
    [withNbsAuth, withApiTokenAuth, withNextAuth, withUnauthorized],
    next,
  );

/**
 * Composed proxy handlers
 */
const proxy = chainProxy([
  authProxy,
  withProcessZipRewrite,
  withUrlParamChecks,
]);

export default proxy;

export const config = {
  matcher: [
    /*
     * Run proxy on all request paths except these:
     * - Public API routes
     * - Error pages
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - images (static files in public/images/ directory)
     */
    "/((?!api/health-check|api/auth|error|_next/static|_next/image|public|img|uswds|images).*)",
    /**
     * Fix issue where the pattern above was causing proxy
     * to not run on the homepage:
     */
    "/",
  ],
};
