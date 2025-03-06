/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import { chainMiddleware } from "@/middleware";
import { withNextAuth } from "@/middlewares/withNextAuth";

// Mock next-auth/jwt getToken
jest.mock("next-auth/jwt", () => ({
  getToken: jest.fn(),
}));

const middleware = chainMiddleware([withNextAuth]);

describe("Next Auth Middleware", () => {
  const ORIG_NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;
  const ORIG_NBS_AUTH = process.env.NBS_AUTH;
  const ORIG_BASE_PATH = process.env.BASE_PATH;
  beforeEach(() => {
    process.env.NEXTAUTH_SECRET = "test-secret";
    process.env.BASE_PATH = "ecr-viewer";
    process.env.NBS_AUTH = "false";
    jest.resetAllMocks(); // Reset mocks before each test
  });
  afterEach(() => {
    process.env.NEXTAUTH_SECRET = ORIG_NEXTAUTH_SECRET;
    process.env.NBS_AUTH = ORIG_NBS_AUTH;
    process.env.BASE_PATH = ORIG_BASE_PATH;
  });

  it("should redirect to the signin url when not authorized", async () => {
    const req = new NextRequest(
      "https://www.example.com/ecr-viewer/api?id=123",
    );

    const resp = await middleware(req);
    expect(resp?.status).toBeGreaterThanOrEqual(300);
    expect(resp?.status).toBeLessThan(400);
    expect(resp?.headers.get("Location")).toBe(
      "https://www.example.com/signin?callbackUrl=%2Fecr-viewer%2Fapi%3Fid%3D123",
    );
  });

  it("should not rediret when authorized", async () => {
    (getToken as jest.Mock).mockResolvedValue("123");
    const req = new NextRequest(
      "https://www.example.com/ecr-viewer/api/fhir-data/",
    );

    const resp = await middleware(req);
    expect(resp?.status).toBe(200);
  });
});
