/**
 * @jest-environment node
 */
import { importSPKI, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

import { chainMiddleware } from "@/middleware";
import { withJwtAuth } from "@/middlewares/withJwtAuth";
import { withUnauthorized } from "@/middlewares/withUnauthorized";

jest.mock("jose", () => ({
  importSPKI: jest.fn(() => "mock-key"),
  jwtVerify: jest.fn(),
  createLocalJWKSet: jest.fn(() => true),
}));

const middleware = chainMiddleware([withJwtAuth, withUnauthorized]);

describe("JWT Auth Middleware", () => {
  const ORIG_BASE_PATH = process.env.BASE_PATH;

  beforeEach(() => {
    process.env.BASE_PATH = "ecr-viewer";
    process.env.JWT_PUB_KEY = "mock-pub-key";
    process.env.JWT_API_PUB_KEY = "mock-api-pub-key";
    jest.resetAllMocks();
    (importSPKI as jest.Mock).mockResolvedValue("mock-key");
  });

  afterEach(() => {
    delete process.env.JWT_PUB_KEY;
    delete process.env.JWT_API_PUB_KEY;
    process.env.BASE_PATH = ORIG_BASE_PATH;
  });

  describe("setAuthCookie", () => {
    it("should strip ?auth= from the URL, set it as an httpOnly cookie, and redirect", async () => {
      const req = new NextRequest(
        "https://www.example.com/ecr-viewer/view-data?id=1234&auth=mytoken",
      );

      const resp = await middleware(req);
      expect(resp.headers.get("location")).toBe(
        "https://www.example.com/ecr-viewer/view-data?id=1234",
      );
      expect(resp.cookies.get("jwt-auth-token")).toMatchObject({
        name: "jwt-auth-token",
        value: "mytoken",
        httpOnly: true,
      });
    });

    it("should not consume ?auth= on non-view-data pages", async () => {
      const req = new NextRequest(
        "https://www.example.com/ecr-viewer/?auth=mytoken",
      );

      const resp = await middleware(req);
      expect(resp.cookies.get("jwt-auth-token")).toBeUndefined();
    });

    it("should not consume ?auth= when neither key is set", async () => {
      delete process.env.JWT_PUB_KEY;
      delete process.env.JWT_API_PUB_KEY;
      const req = new NextRequest(
        "https://www.example.com/ecr-viewer/view-data?id=1234&auth=mytoken",
      );

      const resp = await middleware(req);
      expect(resp.cookies.get("jwt-auth-token")).toBeUndefined();
    });
  });

  describe("pass-through cases", () => {
    it("should pass through when JWT_PUB_KEY is not set", async () => {
      delete process.env.JWT_PUB_KEY;
      const req = new NextRequest(
        "https://www.example.com/ecr-viewer/view-data?id=1234",
      );
      req.cookies.set("jwt-auth-token", "mytoken");

      const resp = await middleware(req);
      expect(jwtVerify).not.toHaveBeenCalled();
      expect(resp.status).toBe(307);
    });

    it("should pass through when not on the view-data page", async () => {
      const req = new NextRequest("https://www.example.com/ecr-viewer/");
      req.cookies.set("jwt-auth-token", "mytoken");

      const resp = await middleware(req);
      expect(jwtVerify).not.toHaveBeenCalled();
      expect(resp.status).toBe(307);
    });

    it("should pass through when no jwt-auth-token cookie is present", async () => {
      const req = new NextRequest(
        "https://www.example.com/ecr-viewer/view-data?id=1234",
      );

      const resp = await middleware(req);
      expect(jwtVerify).not.toHaveBeenCalled();
      expect(resp.status).toBe(307);
    });

    it("should pass through when JWT verification throws", async () => {
      (jwtVerify as jest.Mock).mockRejectedValue(new Error("invalid token"));
      const req = new NextRequest(
        "https://www.example.com/ecr-viewer/view-data?id=1234",
      );
      req.cookies.set("jwt-auth-token", "bad-token");

      const resp = await middleware(req);
      expect(resp.status).toBe(307);
    });
  });

  describe("ecr_id flow (EpiTrax) — first visit with ?id=", () => {
    it("should redirect to clean URL and set jwt-ecr-id cookie when JWT matches", async () => {
      (jwtVerify as jest.Mock).mockResolvedValue({
        payload: { ecr_id: "1234" },
      });
      const req = new NextRequest(
        "https://www.example.com/ecr-viewer/view-data?id=1234",
      );
      req.cookies.set("jwt-auth-token", "mytoken");

      const resp = await middleware(req);
      expect(resp.headers.get("location")).toBe(
        "https://www.example.com/ecr-viewer/view-data",
      );
      expect(resp.cookies.get("jwt-ecr-id")).toMatchObject({
        name: "jwt-ecr-id",
        value: "1234",
        httpOnly: true,
      });
    });

    it("should pass through when JWT ecr_id does not match ?id=", async () => {
      (jwtVerify as jest.Mock).mockResolvedValue({
        payload: { ecr_id: "9999" },
      });
      const req = new NextRequest(
        "https://www.example.com/ecr-viewer/view-data?id=1234",
      );
      req.cookies.set("jwt-auth-token", "mytoken");

      const resp = await middleware(req);
      expect(resp.status).toBe(307);
      expect(resp.cookies.get("jwt-ecr-id")).toBeUndefined();
    });
  });

  describe("ecr_id flow (EpiTrax) — subsequent visits without ?id=", () => {
    it("should rewrite internally with ?id= when JWT and ecr-id cookie match", async () => {
      (jwtVerify as jest.Mock).mockResolvedValue({
        payload: { ecr_id: "1234" },
      });
      const req = new NextRequest(
        "https://www.example.com/ecr-viewer/view-data",
      );
      req.cookies.set("jwt-auth-token", "mytoken");
      req.cookies.set("jwt-ecr-id", "1234");

      const resp = await middleware(req);
      expect(resp.status).toBe(200);
      expect(resp.headers.get("x-middleware-rewrite")).toBe(
        "https://www.example.com/ecr-viewer/view-data?id=1234",
      );
    });

    it("should pass through when no jwt-ecr-id cookie is present", async () => {
      (jwtVerify as jest.Mock).mockResolvedValue({
        payload: { ecr_id: "1234" },
      });
      const req = new NextRequest(
        "https://www.example.com/ecr-viewer/view-data",
      );
      req.cookies.set("jwt-auth-token", "mytoken");

      const resp = await middleware(req);
      expect(resp.status).toBe(307);
    });

    it("should pass through when JWT ecr_id does not match the jwt-ecr-id cookie", async () => {
      (jwtVerify as jest.Mock).mockResolvedValue({
        payload: { ecr_id: "9999" },
      });
      const req = new NextRequest(
        "https://www.example.com/ecr-viewer/view-data",
      );
      req.cookies.set("jwt-auth-token", "mytoken");
      req.cookies.set("jwt-ecr-id", "1234");

      const resp = await middleware(req);
      expect(resp.status).toBe(307);
    });
  });

  describe("no-ecr_id flow (NBS) — first visit with ?id=", () => {
    it("should redirect to clean URL and set jwt-ecr-id cookie without checking ecr_id", async () => {
      (jwtVerify as jest.Mock).mockResolvedValue({ payload: {} });
      const req = new NextRequest(
        "https://www.example.com/ecr-viewer/view-data?id=1234",
      );
      req.cookies.set("jwt-auth-token", "mytoken");

      const resp = await middleware(req);
      expect(resp.headers.get("location")).toBe(
        "https://www.example.com/ecr-viewer/view-data",
      );
      expect(resp.cookies.get("jwt-ecr-id")).toMatchObject({
        name: "jwt-ecr-id",
        value: "1234",
        httpOnly: true,
      });
    });
  });

  describe("no-ecr_id flow (NBS) — subsequent visits without ?id=", () => {
    it("should rewrite internally with ?id= from the jwt-ecr-id cookie", async () => {
      (jwtVerify as jest.Mock).mockResolvedValue({ payload: {} });
      const req = new NextRequest(
        "https://www.example.com/ecr-viewer/view-data",
      );
      req.cookies.set("jwt-auth-token", "mytoken");
      req.cookies.set("jwt-ecr-id", "1234");

      const resp = await middleware(req);
      expect(resp.status).toBe(200);
      expect(resp.headers.get("x-middleware-rewrite")).toBe(
        "https://www.example.com/ecr-viewer/view-data?id=1234",
      );
    });

    it("should authorize as-is when no jwt-ecr-id cookie exists", async () => {
      (jwtVerify as jest.Mock).mockResolvedValue({ payload: {} });
      const req = new NextRequest(
        "https://www.example.com/ecr-viewer/view-data",
      );
      req.cookies.set("jwt-auth-token", "mytoken");

      const resp = await middleware(req);
      expect(resp.status).toBe(200);
    });
  });

  describe("API route auth", () => {
    it("should authorize /api/ routes with a valid Bearer token", async () => {
      (jwtVerify as jest.Mock).mockResolvedValue({ payload: {} });
      const req = new NextRequest(
        "https://www.example.com/ecr-viewer/api/process-zip/",
      );
      req.headers.set("Authorization", "Bearer foobar");

      const resp = await middleware(req);
      expect(jwtVerify).toHaveBeenCalled();
      expect(importSPKI).toHaveBeenCalledWith("mock-api-pub-key", "RS256");
      expect(resp.status).toBe(200);
    });

    it("should pass through (401) when JWT_API_PUB_KEY is not set", async () => {
      delete process.env.JWT_API_PUB_KEY;
      const req = new NextRequest(
        "https://www.example.com/ecr-viewer/api/process-zip",
      );
      req.headers.set("Authorization", "Bearer foobar");

      const resp = await middleware(req);
      expect(jwtVerify).not.toHaveBeenCalled();
      expect(resp.status).toBe(401);
    });

    it("should pass through (401) when no Bearer token is present", async () => {
      const req = new NextRequest(
        "https://www.example.com/ecr-viewer/api/process-zip",
      );

      const resp = await middleware(req);
      expect(resp.status).toBe(401);
    });

    it("should pass through (401) when Bearer token fails verification", async () => {
      (jwtVerify as jest.Mock).mockRejectedValue(new Error("invalid"));
      const req = new NextRequest(
        "https://www.example.com/ecr-viewer/api/process-zip",
      );
      req.headers.set("Authorization", "Bearer badtoken");

      const resp = await middleware(req);
      expect(resp.status).toBe(401);
    });
  });
});
