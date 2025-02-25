/**
 * @jest-environment node
 */
import { middleware } from "@/middleware";
import { NextRequest, NextResponse } from "next/server";
import { importSPKI, jwtVerify } from "jose";
import { NextRequestWithAuth } from "next-auth/middleware";

jest.mock("jose", () => ({
  importSPKI: jest.fn(() => true),
  jwtVerify: jest.fn(() => true),
}));

// Mock next-auth/jwt getToken
jest.mock("next-auth/jwt", () => ({
  getToken: jest.fn(),
}));

describe("Middleware", () => {
  let ORIG_NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;
  let ORIG_NBS_AUTH = process.env.NBS_AUTH;
  let ORIG_BASE_PATH = process.env.BASE_PATH;
  beforeEach(() => {
    process.env.NEXTAUTH_SECRET = "test-secret";
    process.env.BASE_PATH = "ecr-viewer";
    process.env.NBS_AUTH = "true";
    jest.resetAllMocks(); // Reset mocks before each test
  });
  afterEach(() => {
    process.env.NEXTAUTH_SECRET = ORIG_NEXTAUTH_SECRET;
    process.env.NBS_AUTH = ORIG_NBS_AUTH;
    process.env.BASE_PATH = ORIG_BASE_PATH;
  });

  it("should strip the auth query param and set the token", async () => {
    const req = new NextRequest(
      "https://www.example.com/ecr-viewer/api?id=1234&auth=abcd",
    );
    (req as NextRequestWithAuth).nextauth = { token: null };

    const resp = await middleware(req as NextRequestWithAuth);
    expect((resp as NextResponse).cookies.get("auth-token")).toEqual({
      name: "auth-token",
      path: "/",
      value: "abcd",
      httpOnly: true,
    });
    expect(resp?.headers.get("location")).toBe(
      "https://www.example.com/ecr-viewer/api?id=1234",
    );
  });

  it("should not authorize the api endpoints without auth", async () => {
    const req = new NextRequest(
      "https://www.example.com/ecr-viewer/api/fhir-data/",
    );
    (req as NextRequestWithAuth).nextauth = { token: null };

    const resp = await middleware(req as NextRequestWithAuth);
    expect(resp?.headers.get("x-middleware-rewrite")).toBe(
      "https://www.example.com/ecr-viewer/error/auth",
    );
    expect(resp?.status).toBe(200);
  });

  it("should authorize the api endpoints with auth", async () => {
    process.env.NBS_PUB_KEY = "FOOBAR";

    const req = new NextRequest(
      "https://www.example.com/ecr-viewer/api/fhir-data/",
    );
    (req as NextRequestWithAuth).nextauth = { token: null };
    req.cookies.set("auth-token", "foobar");

    const resp = await middleware(req as NextRequestWithAuth);

    expect(jwtVerify).toHaveBeenCalled();
    expect(importSPKI).toHaveBeenCalledWith("FOOBAR", "RS256");
    expect(resp?.status).toBe(200);
  });

  it("should not authorize non api endpoints ", async () => {
    const req = new NextRequest(
      "https://www.example.com/ecr-viewer/view-data?id=1234",
    );
    (req as NextRequestWithAuth).nextauth = { token: null };
    const resp = await middleware(req as NextRequestWithAuth);
    expect(resp?.headers.get("x-middleware-rewrite")).toBe(
      "https://www.example.com/ecr-viewer/error/auth",
    );
    expect(resp?.status).toBe(200);
  });
});
