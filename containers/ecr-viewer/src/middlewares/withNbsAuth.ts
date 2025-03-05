import { importSPKI, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

import { ChainableMiddleware, MiddlewareFactory } from "@/middleware";

/**
 * Middleware for handling NBS authorization
 * @param next Next middleware in the chain
 * @returns a NextResponse
 */
export const withNbsAuth: MiddlewareFactory = (next: ChainableMiddleware) => {
  return async function (request: NextRequest) {
    if (process.env.NBS_AUTH !== "true") return next(request);

    const nbsAuthResp = set_auth_cookie(request);
    if (nbsAuthResp) return nbsAuthResp;

    if (await authorize_api(request)) return next(request);

    return NextResponse.rewrite(
      new URL(`${process.env.BASE_PATH}/error/auth`, request.nextUrl.origin),
      { request },
    );
  };
};

/**
 * Extracts an authentication token from the query parameters of a request and sets it as an HTTP-only
 * cookie on a response object.
 * @param req - The incoming request object provided by Next.js, containing the URL from
 *   which the "auth" query parameter will be extracted.
 * @returns A Next.js response object configured to redirect the user and set the
 *   "auth-token" cookie if the "auth" parameter exists, or `null` if the
 *   "auth" parameter does not exist in the request.
 */
function set_auth_cookie(req: NextRequest) {
  const url = req.nextUrl;
  const auth = url.searchParams.get("auth");
  if (auth) {
    url.searchParams.delete("auth");
    const response = NextResponse.redirect(url);
    response.cookies.set("auth-token", auth, { httpOnly: true });
    return response;
  }
  return null;
}

/**
 * Authorizes API requests based on an authentication token provided in the request's cookies.
 *   The function checks for the presence of an "auth-token" cookie and attempts to verify it
 *   using JWT verification with a public key. If the token is missing or invalid, the function
 *   returns a JSON response indicating that authentication is required with a 401 status code.
 * @param req - The incoming Next.js request object, which includes the request cookies
 *   and URL information used for extracting the authentication token and determining the request path.
 * @returns - Whether the user is authorized.
 */
async function authorize_api(req: NextRequest) {
  const auth = req.cookies.get("auth-token")?.value;

  if (!auth) {
    return false;
  }
  try {
    await jwtVerify(
      auth,
      await importSPKI(process.env.NBS_PUB_KEY as string, "RS256"),
    );
  } catch (e) {
    return false;
  }
  return true;
}
