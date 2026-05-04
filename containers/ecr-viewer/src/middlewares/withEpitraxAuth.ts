import { importSPKI, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

import { ChainableMiddleware, MiddlewareFactory } from "@/middleware";

const EPITRAX_AUTH_COOKIE = "epitrax-auth-token";
const EPITRAX_ECR_ID_COOKIE = "epitrax-ecr-id";

/**
 * Middleware for handling Epitrax authorization.
 *
 * Epitrax generates a short-lived RS256 JWT containing an `ecr_id` claim and
 * passes it as an `?auth=` query parameter alongside `?id=`.  This middleware:
 *   1. Moves the token from `?auth=` to an httpOnly cookie and redirects (so
 *      the token never persists in the browser history).
 *   2. On subsequent requests verifies the token against EPITRAX_PUB_KEY and
 *      checks that the `ecr_id` claim matches the requested `?id=`.
 *
 * Configure the ecr-viewer with the RSA public key that corresponds
 * to the private key stored in Epitrax's `ecr_viewer_jwt_private_key`
 * system property:
 *   EPITRAX_PUB_KEY=<SPKI PEM>
 *
 * @param next Next middleware in the chain
 * @param end Early exit the chain
 * @returns a NextResponse
 */
export const withEpitraxAuth: MiddlewareFactory = (
  next: ChainableMiddleware,
  end: ChainableMiddleware,
) => {
  return async function (request: NextRequest) {
    // Move ?auth= to a cookie and redirect so it never sits in the URL bar
    const cookieResp = setAuthCookie(request);
    if (cookieResp) return cookieResp;

    if (!process.env.EPITRAX_PUB_KEY) return next(request);

    // Epitrax auth only applies to the view-data page
    if (!request.nextUrl.pathname.endsWith("/view-data")) return next(request);

    const token = request.cookies.get(EPITRAX_AUTH_COOKIE)?.value;
    if (!token) return next(request);

    try {
      const { payload } = await jwtVerify(
        token,
        await importSPKI(process.env.EPITRAX_PUB_KEY.trim(), "RS256"),
      );

      const requestedId = request.nextUrl.searchParams.get("id");

      if (requestedId) {
        // First visit: ?id= is in the URL. Verify it matches the JWT claim,
        // store it in an httpOnly cookie, then redirect to the clean URL so
        // the ECR ID is never visible in the browser address bar or history.
        if (!payload.ecr_id || payload.ecr_id !== requestedId) {
          return next(request);
        }
        const cleanUrl = request.nextUrl.clone();
        cleanUrl.searchParams.delete("id");
        const response = NextResponse.redirect(cleanUrl);
        response.cookies.set(EPITRAX_ECR_ID_COOKIE, requestedId, {
          httpOnly: true,
        });
        return response;
      }

      // Subsequent visits: no ?id= in the URL. Read the ECR ID from the
      // cookie set above, verify it still matches the JWT claim, then rewrite
      // the request internally so the page receives searchParams.id without
      // it ever appearing in the browser URL.
      const ecrId = request.cookies.get(EPITRAX_ECR_ID_COOKIE)?.value;
      if (!ecrId || payload.ecr_id !== ecrId) {
        return next(request);
      }
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.searchParams.set("id", ecrId);
      return NextResponse.rewrite(rewriteUrl);
    } catch {
      return next(request);
    }
  };
};

/**
 * Moves the `?auth=` query parameter to an httpOnly cookie and redirects to
 * the same URL without it, so the token never persists in the browser history.
 */
const setAuthCookie = (req: NextRequest): NextResponse | null => {
  const url = req.nextUrl;
  const auth = url.searchParams.get("auth");
  if (!auth) return null;

  // Only consume the ?auth= param on the view-data page to avoid accidentally
  // swallowing tokens intended for other middleware.
  if (!url.pathname.endsWith("/view-data")) return null;

  // If an NBS auth-token cookie already exists this request came via NBS, not
  // Epitrax — leave it alone so withNbsAuth can handle it.
  if (req.cookies.get("auth-token")) return null;

  url.searchParams.delete("auth");
  const response = NextResponse.redirect(url);
  response.cookies.set(EPITRAX_AUTH_COOKIE, auth, { httpOnly: true });
  return response;
};
