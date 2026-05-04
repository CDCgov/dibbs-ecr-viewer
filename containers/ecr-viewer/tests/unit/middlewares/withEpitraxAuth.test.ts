/**
 * @jest-environment node
 */
import { jwtVerify, importSPKI } from "jose";
import { NextRequest } from "next/server";

import { chainMiddleware } from "@/middleware";
import { withEpitraxAuth } from "@/middlewares/withEpitraxAuth";
import { withUnauthorized } from "@/middlewares/withUnauthorized";

jest.mock("jose", () => ({
  importSPKI: jest.fn(() => "mock-key"),
  jwtVerify: jest.fn(),
  createLocalJWKSet: jest.fn(() => true),
}));

const middleware = chainMiddleware([withEpitraxAuth, withUnauthorized]);

describe("EpiTrax Auth Middleware", () => {
  const ORIG_BASE_PATH = process.env.BASE_PATH;

  beforeEach(() => {
    process.env.BASE_PATH = "ecr-viewer";
    process.env.EPITRAX_PUB_KEY = "mock-pub-key";
    jest.resetAllMocks();
    (importSPKI as jest.Mock).mockResolvedValue("mock-key");
  });

  afterEach(() => {
    delete process.env.EPITRAX_PUB_KEY;
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
      expect(resp.cookies.get("epitrax-auth-token")).toMatchObject({
        name: "epitrax-auth-token",
        value: "mytoken",
        httpOnly: true,
      });
    });

    it("should not consume ?auth= on non-view-data pages", async () => {
      const req = new NextRequest(
        "https://www.example.com/ecr-viewer/?auth=mytoken",
      );

      const resp = await middleware(req);
      expect(resp.headers.get("location")).not.toContain("auth=mytoken");
      expect(resp.cookies.get("epitrax-auth-token")).toBeUndefined();
    });

    it("should not consume ?auth= if an NBS auth-token cookie already exists", async () => {
      const req = new NextRequest(
        "https://www.example.com/ecr-viewer/view-data?id=1234&auth=mytoken",
      );
      req.cookies.set("auth-token", "nbs-token");

      const resp = await middleware(req);
      expect(resp.cookies.get("epitrax-auth-token")).toBeUndefined();
    });
  });

  describe("pass-through cases", () => {
    it("should pass through when EPITRAX_PUB_KEY is not set", async () => {
      delete process.env.EPITRAX_PUB_KEY;
      const req = new NextRequest(
        "https://www.example.com/ecr-viewer/view-data?id=1234",
      );
      req.cookies.set("epitrax-auth-token", "mytoken");

      const resp = await middleware(req);
      expect(jwtVerify).not.toHaveBeenCalled();
      expect(resp.status).toBe(307);
    });

    it("should pass through when not on the view-data page", async () => {
      const req = new NextRequest("https://www.example.com/ecr-viewer/");
      req.cookies.set("epitrax-auth-token", "mytoken");

      const resp = await middleware(req);
      expect(jwtVerify).not.toHaveBeenCalled();
      expect(resp.status).toBe(307);
    });

    it("should pass through when no epitrax-auth-token cookie is present", async () => {
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
      req.cookies.set("epitrax-auth-token", "bad-token");

      const resp = await middleware(req);
      expect(resp.status).toBe(307);
    });
  });

  describe("first visit — ?id= present in URL", () => {
    it("should redirect to clean URL and set ecr-id cookie when JWT matches", async () => {
      (jwtVerify as jest.Mock).mockResolvedValue({
        payload: { ecr_id: "1234" },
      });
      const req = new NextRequest(
        "https://www.example.com/ecr-viewer/view-data?id=1234",
      );
      req.cookies.set("epitrax-auth-token", "mytoken");

      const resp = await middleware(req);
      expect(resp.headers.get("location")).toBe(
        "https://www.example.com/ecr-viewer/view-data",
      );
      expect(resp.cookies.get("epitrax-ecr-id")).toMatchObject({
        name: "epitrax-ecr-id",
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
      req.cookies.set("epitrax-auth-token", "mytoken");

      const resp = await middleware(req);
      expect(resp.status).toBe(307);
      expect(resp.cookies.get("epitrax-ecr-id")).toBeUndefined();
    });

    it("should pass through when JWT has no ecr_id claim", async () => {
      (jwtVerify as jest.Mock).mockResolvedValue({ payload: {} });
      const req = new NextRequest(
        "https://www.example.com/ecr-viewer/view-data?id=1234",
      );
      req.cookies.set("epitrax-auth-token", "mytoken");

      const resp = await middleware(req);
      expect(resp.status).toBe(307);
    });
  });

  describe("subsequent visits — clean URL, no ?id=", () => {
    it("should rewrite internally with ?id= when JWT and ecr-id cookie match", async () => {
      (jwtVerify as jest.Mock).mockResolvedValue({
        payload: { ecr_id: "1234" },
      });
      const req = new NextRequest(
        "https://www.example.com/ecr-viewer/view-data",
      );
      req.cookies.set("epitrax-auth-token", "mytoken");
      req.cookies.set("epitrax-ecr-id", "1234");

      const resp = await middleware(req);
      expect(resp.status).toBe(200);
      expect(resp.headers.get("x-middleware-rewrite")).toBe(
        "https://www.example.com/ecr-viewer/view-data?id=1234",
      );
    });

    it("should pass through when no epitrax-ecr-id cookie is present", async () => {
      (jwtVerify as jest.Mock).mockResolvedValue({
        payload: { ecr_id: "1234" },
      });
      const req = new NextRequest(
        "https://www.example.com/ecr-viewer/view-data",
      );
      req.cookies.set("epitrax-auth-token", "mytoken");

      const resp = await middleware(req);
      expect(resp.status).toBe(307);
    });

    it("should pass through when JWT ecr_id does not match the ecr-id cookie", async () => {
      (jwtVerify as jest.Mock).mockResolvedValue({
        payload: { ecr_id: "9999" },
      });
      const req = new NextRequest(
        "https://www.example.com/ecr-viewer/view-data",
      );
      req.cookies.set("epitrax-auth-token", "mytoken");
      req.cookies.set("epitrax-ecr-id", "1234");

      const resp = await middleware(req);
      expect(resp.status).toBe(307);
    });
  });
});
