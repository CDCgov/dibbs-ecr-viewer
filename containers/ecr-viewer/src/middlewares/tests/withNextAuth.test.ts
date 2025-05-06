/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import { chainMiddleware } from "@/middleware";
import { withNextAuth } from "@/middlewares/withNextAuth";
import { withUnauthorized } from "@/middlewares/withUnauthorized";

// Mock next-auth/jwt getToken
jest.mock("next-auth/jwt", () => ({
  getToken: jest.fn(),
}));

jest.mock("../../app/api/auth/auth");

const middleware = chainMiddleware([withNextAuth, withUnauthorized]);

describe("Next Auth Middleware", () => {
  const ORIG_NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;
  const ORIG_NBS_PUB_KEY = process.env.NBS_PUB_KEY;
  const ORIG_BASE_PATH = process.env.BASE_PATH;
  beforeEach(() => {
    process.env.NEXTAUTH_SECRET = "test-secret";
    process.env.BASE_PATH = "ecr-viewer";
    delete process.env.NBS_PUB_KEY;
    process.env.AUTH_PROVIDER = "keycloak";
    jest.clearAllMocks(); // Reset mocks before each test
  });
  afterEach(() => {
    process.env.NEXTAUTH_SECRET = ORIG_NEXTAUTH_SECRET;
    process.env.NBS_PUB_KEY = ORIG_NBS_PUB_KEY;
    process.env.BASE_PATH = ORIG_BASE_PATH;
    delete process.env.AUTH_PROVIDER;
  });

  it("should redirect to the signin url when not authorized", async () => {
    const req = new NextRequest(
      "https://www.example.com/ecr-viewer/view-data?id=123",
    );

    const resp = await middleware(req);
    expect(resp?.status).toBeGreaterThanOrEqual(300);
    expect(resp?.status).toBeLessThan(400);
    expect(resp?.headers.get("Location")).toBe(
      "https://www.example.com/signin?callbackUrl=%2Fecr-viewer%2Fview-data%3Fid%3D123",
    );
  });

  it("should send a 401 when not authorized to api route", async () => {
    const req = new NextRequest(
      "https://www.example.com/ecr-viewer/api/process-zip",
      { method: "post" },
    );

    const resp = await middleware(req);
    expect(resp?.status).toBe(401);
  });

  it("should not redirect when authorized", async () => {
    (getToken as jest.Mock).mockResolvedValue("123");
    const req = new NextRequest("https://www.example.com/ecr-viewer");

    const resp = await middleware(req);
    expect(resp?.status).toBe(200);
    expect(getToken).toHaveBeenCalled();
  });

  it("should redirect when not configured", async () => {
    delete process.env.AUTH_PROVIDER;
    const req = new NextRequest(
      "https://www.example.com/ecr-viewer/api/fhir-data/",
    );

    const resp = await middleware(req);
    expect(resp?.status).toBe(307);
    expect(getToken).not.toHaveBeenCalled();
  });

  describe("when used in conjucntion with NBS auth", () => {
    beforeEach(() => {
      process.env.NBS_PUB_KEY = "foo";
    });

    it("should pass through if nbs authorized", async () => {
      (getToken as jest.Mock).mockResolvedValue("123");
      const req = new NextRequest(
        "https://www.example.com/ecr-viewer/api/fhir-data/",
      );
      req.headers.set("x-nbs-authorized", "true");

      const resp = await middleware(req);
      expect(resp?.status).toBe(200);
      expect(getToken).not.toHaveBeenCalled();
    });

    it("should delegate to next auth when not nbs authorized", async () => {
      (getToken as jest.Mock).mockResolvedValue("123");
      const req = new NextRequest(
        "https://www.example.com/ecr-viewer/api/fhir-data/",
      );
      req.headers.set("x-nbs-authorized", "false");

      const resp = await middleware(req);
      expect(resp?.status).toBe(200);
      expect(getToken).toHaveBeenCalled();
    });
  });

  describe("when used in conjucntion with API token auth", () => {
    it("should pass through if API authorized", async () => {
      (getToken as jest.Mock).mockResolvedValue("123");
      const req = new NextRequest(
        "https://www.example.com/ecr-viewer/api/fhir-data/",
      );
      req.headers.set("x-api-authorized", "true");

      const resp = await middleware(req);
      expect(resp?.status).toBe(200);
      expect(getToken).not.toHaveBeenCalled();
    });

    it("should delegate to next auth when not api token authorized", async () => {
      (getToken as jest.Mock).mockResolvedValue("123");
      const req = new NextRequest(
        "https://www.example.com/ecr-viewer/api/fhir-data/",
      );
      req.headers.set("x-api-authorized", "false");

      const resp = await middleware(req);
      expect(resp?.status).toBe(200);
      expect(getToken).toHaveBeenCalled();
    });
  });
});
