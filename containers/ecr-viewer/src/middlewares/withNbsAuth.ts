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

    if (!process.env.NBS_PUB_KEY && !process.env.NBS_API_PUB_KEY)
      return next(request);

    // NBS auth can only be used for ecr viewer pages
    const { pathname } = request.nextUrl;
    let key: string | undefined = undefined;
    if (pathname.endsWith(`/view-data`)) {
      // Only allow auth param on view-data requests
      const nbsAuthResp = setAuthCookie(request);
      if (nbsAuthResp) return nbsAuthResp;

      key = process.env.NBS_PUB_KEY;
    } else if (pathname.includes(`/api/`)) {
      key = process.env.NBS_API_PUB_KEY;
    }

    // No NBS auth to do here
    if (!key) return next(request);

    const isAuthorized = await checkIsAuthorized(request, key);
    if (isAuthorized) {
      return end(request);
    } else {
      // set the header on the request to get more helpful error page if we never auth
      request.headers.set(NBS_AUTH_HEADER, `${isAuthorized}`);
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

/**
 * Authorizes requests based on an authentication token provided in the request's cookies or headers.
 *   The function checks for the presence of an "auth-token" cookie or "Authorization" header and attempts to verify it
 *   using JWT verification with a public key. If the token is missing or invalid, the function
 *   returns a JSON response indicating that authentication is required with a 401 status code.
 * @param req - The incoming Next.js request object, which includes the request cookies
 *   and URL information used for extracting the authentication token and determining the request path.
 * @param key - The public key that should be used to verify the token
 * @returns - Whether the user is authorized.
 */
const checkIsAuthorized = async (req: NextRequest, key: string) => {
  const auth = req.cookies.get("auth-token")?.value || getTokenFromHeaders(req);

  if (!auth) {
    return false;
  }
  try {
    await jwtVerify(auth, await importSPKI(key.trim(), "RS256"));
  } catch (e) {
    return false;
  }
  return true;
};
