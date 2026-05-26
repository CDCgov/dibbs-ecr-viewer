import { importSPKI, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

import { ChainableMiddleware, MiddlewareFactory } from "@/middleware";

import { getTokenFromHeaders } from "./withApiTokenAuth";

export const JWT_AUTH_HEADER = "x-jwt-authorized";
const JWT_AUTH_COOKIE = "jwt-auth-token";
const JWT_ECR_ID_COOKIE = "jwt-ecr-id";

/**
 * Middleware for handling JWT-based authorization from integrated case management
 * systems (NBS, EpiTrax, etc.).
 *
 * The external system generates a short-lived RS256 JWT and passes it as an
 * `?auth=` query parameter. This middleware:
 *   1. Moves the token from `?auth=` to an httpOnly cookie and redirects (so
 *      the token never persists in the browser history).
 *   2. On subsequent view-data requests, verifies the token against JWT_PUB_KEY.
 *      - If the JWT contains an `ecr_id` claim, verifies it matches the requested
 *        `?id=` and removes the ID from the URL, storing it in a cookie instead.
 *      - If the JWT has no `ecr_id` claim, authorizes without ID verification and
 *        still removes `?id=` from the URL for consistency.
 *   3. For /api/ routes, verifies a Bearer token against JWT_API_PUB_KEY.
 *
 * Environment variables:
 *   JWT_PUB_KEY     — RSA public key (SPKI PEM) for view-data page auth
 *   JWT_API_PUB_KEY — RSA public key (SPKI PEM) for /api/ route auth
 *
 * @param next Next middleware in the chain
 * @param end Early exit the chain
 * @returns a NextResponse
 */
export const withJwtAuth: MiddlewareFactory = (
  next: ChainableMiddleware,
  end: ChainableMiddleware,
) => {
  return async function (request: NextRequest) {
    request.headers.delete(JWT_AUTH_HEADER);

    if (!process.env.JWT_PUB_KEY && !process.env.JWT_API_PUB_KEY)
      return next(request);

    const cookieResp = setAuthCookie(request);
    if (cookieResp) return cookieResp;

    const { pathname } = request.nextUrl;
    if (pathname.endsWith("/view-data")) {
      return handleViewData(request, next, end);
    }
    if (pathname.includes("/api/")) {
      return handleApi(request, next, end);
    }
    return next(request);
  };
};

const handleViewData = async (
  request: NextRequest,
  next: ChainableMiddleware,
  end: ChainableMiddleware,
): Promise<NextResponse> => {
  if (!process.env.JWT_PUB_KEY) return next(request);

  const token = request.cookies.get(JWT_AUTH_COOKIE)?.value;
  if (!token) return next(request);

  let payload: Record<string, unknown>;
  try {
    const result = await jwtVerify(
      token,
      await importSPKI(process.env.JWT_PUB_KEY.trim(), "RS256"),
    );
    payload = result.payload as Record<string, unknown>;
  } catch {
    request.headers.set(JWT_AUTH_HEADER, "false");
    return next(request);
  }

  const requestedId = request.nextUrl.searchParams.get("id");

  if (requestedId) {
    // If the JWT has an ecr_id claim, it must match the requested ID.
    // If there is no ecr_id claim (NBS flow), skip the check.
    if (payload.ecr_id && payload.ecr_id !== requestedId) {
      return next(request);
    }
    const cleanUrl = request.nextUrl.clone();
    cleanUrl.searchParams.delete("id");
    const response = NextResponse.redirect(cleanUrl);
    response.cookies.set(JWT_ECR_ID_COOKIE, requestedId, { httpOnly: true });
    return response;
  }

  // Subsequent visits: no ?id= in URL. Use the cookie to rewrite internally.
  const ecrId = request.cookies.get(JWT_ECR_ID_COOKIE)?.value;

  if (payload.ecr_id) {
    // ecr_id flow: verify the cookie still matches the JWT claim
    if (!ecrId || payload.ecr_id !== ecrId) return next(request);
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.searchParams.set("id", ecrId);
    return NextResponse.rewrite(rewriteUrl);
  }

  // No ecr_id in JWT (NBS flow): rewrite with whatever ID is in the cookie,
  // or authorize as-is if there is no ID at all.
  if (ecrId) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.searchParams.set("id", ecrId);
    return NextResponse.rewrite(rewriteUrl);
  }

  return end(request);
};

const handleApi = async (
  request: NextRequest,
  next: ChainableMiddleware,
  end: ChainableMiddleware,
): Promise<NextResponse> => {
  if (!process.env.JWT_API_PUB_KEY) return next(request);

  const token = getTokenFromHeaders(request);
  if (!token) return next(request);

  try {
    await jwtVerify(
      token,
      await importSPKI(process.env.JWT_API_PUB_KEY.trim(), "RS256"),
    );
    return end(request);
  } catch {
    return next(request);
  }
};

/**
 * Moves the `?auth=` query parameter to an httpOnly cookie and redirects to
 * the same URL without it, so the token never persists in the browser history.
 * Only acts on view-data requests.
 */
const setAuthCookie = (req: NextRequest): NextResponse | null => {
  const url = req.nextUrl;
  if (!url.pathname.endsWith("/view-data")) return null;

  const auth = url.searchParams.get("auth");
  if (!auth) return null;

  url.searchParams.delete("auth");
  const response = NextResponse.redirect(url);
  response.cookies.set(JWT_AUTH_COOKIE, auth, { httpOnly: true });
  return response;
};
