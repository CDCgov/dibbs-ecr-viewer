import { createLocalJWKSet, createRemoteJWKSet, jwtVerify } from "jose";
import { NextRequest } from "next/server";

import { providerMap } from "@/app/api/auth/providers";
import { ChainableProxy, ProxyFactory } from "@/proxy";

const providerCache = { wellKnown: "", key: createLocalJWKSet({ keys: [] }) };

// update the public key info
const updateProviderCache = async () => {
  const provider = providerMap[0];
  const oidcConfigResp = await fetch(provider.wellKnown!);
  const oidcConfig = await oidcConfigResp.json();
  providerCache.wellKnown = provider.wellKnown!;
  providerCache.key = createRemoteJWKSet(new URL(oidcConfig?.jwks_uri));
};

/**
 * Proxy for handling authorization of api routes via token
 * @param next Next proxy in the chain
 * @param end Early exit the chain
 * @returns a NextResponse
 */
export const withApiTokenAuth: ProxyFactory = (
  next: ChainableProxy,
  end: ChainableProxy,
) => {
  return async function (request: NextRequest) {
    // IDP Auth not actually set up, so bail out
    if (!process.env.AUTH_PROVIDER) {
      return next(request);
    }

    // Token auth only available for api routes
    if (!request.nextUrl.pathname.includes(`/api/`)) {
      return next(request);
    }

    // Make sure we have a token, if not, bail out
    const authToken = getTokenFromHeaders(request);
    if (!authToken) return next(request);

    // populate cache if needed
    const provider = providerMap[0];
    if (provider.wellKnown !== providerCache.wellKnown) {
      await updateProviderCache();
    }

    try {
      await jwtVerify(authToken, providerCache.key, {
        clockTolerance: 15,
      });
      return end(request);
    } catch {
      return next(request);
    }
  };
};

/**
 * Get a bearer authorization token from the request headers
 * @param request The api request
 * @returns the token, if available
 */
export const getTokenFromHeaders = (
  request: NextRequest,
): string | undefined => {
  const [method, authToken] =
    request.headers.get("Authorization")?.split(" ") || [];
  if (method === "Bearer" && !!authToken) {
    return authToken;
  }
};
