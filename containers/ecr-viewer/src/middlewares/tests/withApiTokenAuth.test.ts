/**
 * @jest-environment node
 */
import { importSPKI, jwtVerify } from "jose";
import { NextRequest } from "next/server";

import { chainMiddleware } from "@/middleware";
import { withApiTokenAuth } from "@/middlewares/withApiTokenAuth";

jest.mock("jose", () => ({
  importSPKI: jest.fn(() => true),
  jwtVerify: jest.fn(() => true),
  createLocalJWKSet: jest.fn(() => true),
  createRemoteJWKSet: jest.fn(),
}));

const middleware = chainMiddleware([withApiTokenAuth]);

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
    const req = new NextRequest(
      "https://www.example.com/ecr-viewer/api/process-zip/",
    );
    req.cookies.set("auth-token", "foobar");

    const resp = await middleware(req);
    expect(req?.headers.get("x-nbs-authorized")).toBe("true");
    expect(resp?.status).toBe(200);
  });

  it("should authorize the api endpoints with auth", async () => {
    process.env.NBS_PUB_KEY = "FOOBAR";

    const req = new NextRequest(
      "https://www.example.com/ecr-viewer/view-data?id=1234",
    );
    req.cookies.set("auth-token", "foobar");

    const resp = await middleware(req);

    expect(jwtVerify).toHaveBeenCalled();
    expect(importSPKI).toHaveBeenCalledWith("FOOBAR", "RS256");
    expect(req?.headers.get("x-nbs-authorized")).toBe("true");
    expect(resp?.status).toBe(200);
  });

  it("should not do anything on a non-nbs auth'ed page", async () => {
    const req = new NextRequest("https://www.example.com/ecr-viewer/");
    req.cookies.set("auth-token", "foobar");

    // make sure passed in header is ignored
    req.headers.set("x-nbs-authorized", "true");

    const resp = await middleware(req);
    expect(req?.headers.get("x-nbs-authorized")).toBe(null);
    expect(resp?.status).toBe(200);
  });

  it("should not authorize with no token", async () => {
    const req = new NextRequest(
      "https://www.example.com/ecr-viewer/view-data?id=1234",
    );
    const resp = await middleware(req);
    expect(req?.headers.get("x-nbs-authorized")).toBe("false");
    expect(resp?.status).toBe(200);
  });
});
