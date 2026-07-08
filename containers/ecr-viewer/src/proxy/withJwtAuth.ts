import { importSPKI, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

import { ChainableProxy, ProxyFactory } from "@/proxy";

import { getTokenFromHeaders } from "./withApiTokenAuth";

export const JWT_AUTH_HEADER = "x-jwt-authorized";
const JWT_AUTH_COOKIE = "jwt-auth-token";
const JWT_ECR_ID_COOKIE = "jwt-ecr-id";

const DEPRECATED_ENV_WARNED = new Set<string>();

/**
 * Returns process.env[newEnv] if set; otherwise falls back to process.env[deprecatedEnv]
 * and emits a one-time deprecation warning.
 */
const resolveKey = (
  newEnv: string,
  deprecatedEnv: string,
): string | undefined => {
  const val = process.env[newEnv];
  if (val) return val;
  const fallback = process.env[deprecatedEnv];
  if (fallback) {
    if (!DEPRECATED_ENV_WARNED.has(deprecatedEnv)) {
      DEPRECATED_ENV_WARNED.add(deprecatedEnv);
      console.warn(
        `[ecr-viewer] ${deprecatedEnv} is deprecated — rename it to ${newEnv}. Support will be removed in a future release.`,
      );
    }
    return fallback;
  }
  return undefined;
};

/**
 * Proxy for handling JWT-based authorization from integrated case management
 * systems (NBS, EpiTrax, etc.).
 *
 * The external system generates a short-lived RS256 JWT and passes it as an
 * `?auth=` query parameter. This proxy:
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
 * Deprecated (kept for backwards compatibility — rename to the above):
 *   NBS_PUB_KEY     — deprecated alias for JWT_PUB_KEY
 *   NBS_API_PUB_KEY — deprecated alias for JWT_API_PUB_KEY
 *
 * @param next Next middleware in the chain
 * @param end Early exit the chain
 * @returns a NextResponse
 */
export const withJwtAuth: ProxyFactory = (
  next: ChainableProxy,
  end: ChainableProxy,
) => {
  return async function (request: NextRequest) {
    request.headers.delete(JWT_AUTH_HEADER);

    if (
      !resolveKey("JWT_PUB_KEY", "NBS_PUB_KEY") &&
      !resolveKey("JWT_API_PUB_KEY", "NBS_API_PUB_KEY")
    )
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
  next: ChainableProxy,
  end: ChainableProxy,
): Promise<NextResponse> => {
  const pubKey = resolveKey("JWT_PUB_KEY", "NBS_PUB_KEY");
  if (!pubKey) return next(request);

  const token = request.cookies.get(JWT_AUTH_COOKIE)?.value;
  if (!token) return next(request);

  let payload: Record<string, unknown>;
  try {
    const result = await jwtVerify(
      token,
      await importSPKI(pubKey.trim(), "RS256"),
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
  next: ChainableProxy,
  end: ChainableProxy,
): Promise<NextResponse> => {
  const apiPubKey = resolveKey("JWT_API_PUB_KEY", "NBS_API_PUB_KEY");
  const bearerToken = getTokenFromHeaders(request);

  if (apiPubKey && bearerToken) {
    try {
      await jwtVerify(bearerToken, await importSPKI(apiPubKey.trim(), "RS256"));
      return end(request);
    } catch {
      return next(request);
    }
  }

  // If no Bearer token try the JWT cookie for subsequent API calls
  // (e.g. View XML button), verified against the same API key.
  const cookieToken = request.cookies.get(JWT_AUTH_COOKIE)?.value;
  if (!cookieToken || !apiPubKey) return next(request);

  try {
    await jwtVerify(cookieToken, await importSPKI(apiPubKey.trim(), "RS256"));
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
