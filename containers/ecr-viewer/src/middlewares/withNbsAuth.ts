import { importSPKI, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

import { ChainableMiddleware, MiddlewareFactory } from "@/middleware";

import { getTokenFromHeaders } from "./withApiTokenAuth";

export const NBS_AUTH_HEADER = "x-nbs-authorized";

/**
 * Middleware for handling NBS authorization
 * @param next Next middleware in the chain
 * @param end Early exit the chain
 * @returns a NextResponse
 */
export const withNbsAuth: MiddlewareFactory = (
  next: ChainableMiddleware,
  end: ChainableMiddleware,
) => {
  return async function (request: NextRequest) {
    // make sure only internal values are valid
    request.headers.delete(NBS_AUTH_HEADER);

    // always strip auth token
    const nbsAuthResp = setAuthCookie(request);
    if (nbsAuthResp) return nbsAuthResp;

    if (!process.env.NBS_PUB_KEY && !process.env.NBS_API_PUB_KEY)
      return next(request);

    // NBS auth can only be used for ecr viewer pages
    const { pathname } = request.nextUrl;
    let key: string | undefined = undefined;
    let token: string | undefined = undefined;
    if (pathname.endsWith(`/view-data`)) {
      // Only allow auth param on view-data requests
      key = process.env.NBS_PUB_KEY;
      token = request.cookies.get("auth-token")?.value;
    } else if (pathname.includes(`/api/`)) {
      key = process.env.NBS_API_PUB_KEY;
    }
    token ||= getTokenFromHeaders(request);

    // No NBS auth to do here
    if (!key || !token) return next(request);

    try {
      await jwtVerify(token, await importSPKI(key.trim(), "RS256"));
      return end(request);
    } catch {
      // set the header on the request to get more helpful error page if we never auth
      request.headers.set(NBS_AUTH_HEADER, "false");
      return next(request);
    }
  };
};

/**
 * Extracts an authentication token from the query parameters of a request and sets it as an HTTP-only
 * cookie on a response object. We move this to a cookie and redirect so that the user
 * doesn't see the cookie in their url bar.
 * @param req - The incoming request object provided by Next.js, containing the URL from
 *   which the "auth" query parameter will be extracted.
 * @returns A Next.js response object configured to redirect the user and set the
 *   "auth-token" cookie if the "auth" parameter exists, or `null` if the
 *   "auth" parameter does not exist in the request.
 */
const setAuthCookie = (req: NextRequest): NextResponse | null => {
  const url = req.nextUrl;
  const auth = url.searchParams.get("auth");
  if (auth) {
    url.searchParams.delete("auth");
    const response = NextResponse.redirect(url);
    response.cookies.set("auth-token", auth, { httpOnly: true });
    return response;
  }
  return null;
};
