/**
 * @jest-environment node
 */
import { importSPKI, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

import { chainMiddleware } from "@/middleware";
import { withNbsAuth } from "@/middlewares/withNbsAuth";
import { withUnauthorized } from "@/middlewares/withUnauthorized";

jest.mock("jose", () => ({
  importSPKI: jest.fn(() => true),
  jwtVerify: jest.fn(() => true),
  createLocalJWKSet: jest.fn(() => true),
}));

const middleware = chainMiddleware([withNbsAuth, withUnauthorized]);

describe("NBS Auth Middleware", () => {
  const ORIG_BASE_PATH = process.env.BASE_PATH;
  beforeEach(() => {
    process.env.BASE_PATH = "ecr-viewer";
    process.env.NBS_PUB_KEY = "foo";
    process.env.NBS_API_PUB_KEY = "foo";
    jest.resetAllMocks(); // Reset mocks before each test
  });
  afterEach(() => {
    delete process.env.NBS_PUB_KEY;
    delete process.env.NBS_API_PUB_KEY;
    process.env.BASE_PATH = ORIG_BASE_PATH;
  });

  it("should strip the auth query param and set the token", async () => {
    const req = new NextRequest(
      "https://www.example.com/ecr-viewer/view-data?id=1234&auth=abcd",
    );

    const resp = await middleware(req);
    expect((resp as NextResponse).cookies.get("auth-token")).toEqual({
      name: "auth-token",
      path: "/",
      value: "abcd",
      httpOnly: true,
    });
    expect(resp?.headers.get("location")).toBe(
      "https://www.example.com/ecr-viewer/view-data?id=1234",
    );
  });

  it("should authorize the api endpoints with auth", async () => {
    const req = new NextRequest(
      "https://www.example.com/ecr-viewer/api/process-zip/",
    );
    req.headers.set("Authorization", "Bearer foobar");

    const resp = await middleware(req);
    expect(jwtVerify).toHaveBeenCalled();
    expect(resp?.status).toBe(200);
  });

  it("should authorize the non-api endpoints with auth", async () => {
    process.env.NBS_PUB_KEY = "FOOBAR";

    const req = new NextRequest(
      "https://www.example.com/ecr-viewer/view-data?id=1234",
    );
    req.cookies.set("auth-token", "foobar");

    const resp = await middleware(req);

    expect(jwtVerify).toHaveBeenCalled();
    expect(importSPKI).toHaveBeenCalledWith("FOOBAR", "RS256");
    expect(resp?.status).toBe(200);
  });

  it("should not authorize on a non-nbs auth'ed page", async () => {
    const req = new NextRequest("https://www.example.com/ecr-viewer/");
    req.cookies.set("auth-token", "foobar");

    const resp = await middleware(req);
    expect(resp?.status).toBe(307);
    expect(resp?.headers.get("Location")).toBe(
      "https://www.example.com/ecr-viewer/error/notfound",
    );
  });

  it("should not authorize gui route with no token", async () => {
    const req = new NextRequest(
      "https://www.example.com/ecr-viewer/view-data?id=1234",
    );
    const resp = await middleware(req);
    expect(req?.headers.get("x-nbs-authorized")).toBe(null);
    expect(resp?.status).toBe(307);
    expect(resp?.headers.get("Location")).toBe(
      "https://www.example.com/ecr-viewer/error/notfound",
    );
  });

  it("should not authorize api route with no token", async () => {
    const req = new NextRequest(
      "https://www.example.com/ecr-viewer/api/process-zip",
    );
    const resp = await middleware(req);
    expect(req?.headers.get("x-nbs-authorized")).toBe(null);
    expect(resp?.status).toBe(401);
  });
});
