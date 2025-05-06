/**
 * @jest-environment node
 */
import { jwtVerify } from "jose";
import { NextRequest } from "next/server";

import { chainMiddleware } from "@/middleware";
import { withApiTokenAuth } from "@/middlewares/withApiTokenAuth";
import { withUnauthorized } from "@/middlewares/withUnauthorized";

jest.mock("jose", () => ({
  importSPKI: jest.fn(() => true),
  jwtVerify: jest.fn(() => true),
  createLocalJWKSet: jest.fn(() => true),
  createRemoteJWKSet: jest.fn(),
}));

jest.mock("../../app/api/auth/providers", () => ({
  providerMap: [
    {
      id: "keycloak",
      name: "Keycloak",
      wellKnown: "http://example.com",
    },
  ],
}));

const middleware = chainMiddleware([withApiTokenAuth, withUnauthorized]);

describe("API Token Auth Middleware", () => {
  const ORIG_NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;
  const ORIG_NBS_PUB_KEY = process.env.NBS_PUB_KEY;
  const ORIG_BASE_PATH = process.env.BASE_PATH;
  beforeEach(() => {
    process.env.BASE_PATH = "ecr-viewer";
    process.env.AUTH_PROVIDER = "keycloak";
    process.env.NEXTAUTH_SECRET = "test-secret";
    delete process.env.NBS_PUB_KEY;
    jest.resetAllMocks(); // Reset mocks before each test
  });
  afterEach(() => {
    process.env.NEXTAUTH_SECRET = ORIG_NEXTAUTH_SECRET;
    process.env.NBS_PUB_KEY = ORIG_NBS_PUB_KEY;
    process.env.BASE_PATH = ORIG_BASE_PATH;
    delete process.env.AUTH_PROVIDER;
  });

  it("should authorize the api endpoints with auth", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: jest
        .fn()
        .mockResolvedValue({ jwks_uri: "http://url.to/somewhere" }),
    }) as jest.Mock;

    const req = new NextRequest(
      "https://www.example.com/ecr-viewer/api/process-zip/",
    );
    req.headers.set("Authorization", "Bearer foobar");

    const resp = await middleware(req);
    expect(jwtVerify).toHaveBeenCalled();
    expect(resp?.status).toBe(200);
  });

  it("should not do anything with no auth provider set", async () => {
    delete process.env.AUTH_PROVIDER;
    const req = new NextRequest(
      "https://www.example.com/ecr-viewer/api/process-zip",
    );
    req.headers.set("Authorization", "Bearer foobar");

    const resp = await middleware(req);
    expect(jwtVerify).not.toHaveBeenCalled();
    expect(resp?.status).not.toBe(200);
  });

  it("should not do anything on a non-api auth'ed page", async () => {
    const req = new NextRequest("https://www.example.com/ecr-viewer/");
    req.headers.set("Authorization", "Bearer foobar");

    const resp = await middleware(req);
    expect(jwtVerify).not.toHaveBeenCalled();
    expect(resp?.status).not.toBe(200);
  });

  it("should not authorize with no token", async () => {
    const req = new NextRequest(
      "https://www.example.com/ecr-viewer/api/process-zip",
    );
    const resp = await middleware(req);
    expect(resp?.status).not.toBe(200);
  });
});
