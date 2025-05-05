// Adapted from 'next-auth' to work with chained middleware approadh

import { createLocalJWKSet, createRemoteJWKSet, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

import { providerMap } from "@/app/api/auth/providers";
import { ChainableMiddleware, MiddlewareFactory } from "@/middleware";

import { isNBSAuthed } from "./withNbsAuth";

const API_AUTH_HEADER = "x-api-authorized";

const emptyCache = { wellKnown: "", key: createLocalJWKSet({ keys: [] }) };

const providerCache = { ...emptyCache };

const updateProviderCache = async () => {
  const provider = providerMap[0];
  const oidcConfigResp = await fetch(provider.wellKnown!);
  const oidcConfig = await oidcConfigResp.json();
  providerCache.wellKnown = provider.wellKnown!;
  providerCache.key = createRemoteJWKSet(new URL(oidcConfig?.jwks_uri));
};

updateProviderCache();

/**
 * Middleware for handling next authorization
 * @param next Next middleware in the chain
 * @returns a NextResponse
 */
export const withApiTokenAuth: MiddlewareFactory = (
  next: ChainableMiddleware,
) => {
  return async function (request: NextRequest) {
    // User already authorized to view this page, skip oidc token auth flow
    if (isNBSAuthed(request)) {
      return next(request);
    }

    // Token auth only available for api routes
    if (!request.nextUrl.pathname.startsWith(`/api/`)) {
      return next(request);
    }

    // Make sure we have a token, if not, maybe they'll auth with NextAuth
    const [method, authToken] =
      request.headers.get("Authorization")?.split(" ") || [];
    if (method !== "Bearer" || !authToken) {
      return next(request);
    }

    // Auth not actually set up or NBS didn't auth, so return 401
    if (!process.env.AUTH_PROVIDER) {
      return NextResponse.json(
        { message: "Authentication required to use API" },
        { status: 401 },
      );
    }

    // populate cache if needed
    const provider = providerMap[0];
    if (provider.wellKnown !== providerCache.wellKnown) {
      await updateProviderCache();
    }

    try {
      await jwtVerify(authToken, providerCache.key, {
        clockTolerance: 15,
      });
      request.headers.set(API_AUTH_HEADER, `true`);
      return next(request);
    } catch {
      return NextResponse.json(
        { message: "API use requires authentication" },
        { status: 401 },
      );
    }
  };
};

/**
 *
 * @param request Request being processed
 * @returns whether this request has already been auth'ed via NBS
 */
export const isApiTokenAuthed = (request: NextRequest): boolean => {
  return (
    request.nextUrl.pathname.startsWith(`/api/`) &&
    request.headers.get(API_AUTH_HEADER) === "true"
  );
};
