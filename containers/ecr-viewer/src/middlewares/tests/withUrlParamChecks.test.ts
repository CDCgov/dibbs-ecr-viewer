/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

import { chainMiddleware } from "@/middleware";
import { withUrlParamChecks } from "@/middlewares/withUrlParamChecks";

const middleware = chainMiddleware([withUrlParamChecks]);

describe("Param Check Middleware", () => {
  it("should redirect to a url without a bad param", async () => {
    const req = new NextRequest(
      "https://www.example.com/ecr-viewer?page=-2&itemsPerPage=3",
    );

    const resp = await middleware(req);
    expect(resp?.status).toBeGreaterThanOrEqual(300);
    expect(resp?.status).toBeLessThan(400);
    expect(resp?.headers.get("Location")).toBe(
      "https://www.example.com/ecr-viewer?itemsPerPage=3",
    );
  });

  it("should redirect to a url without multiple params", async () => {
    const req = new NextRequest(
      "https://www.example.com/ecr-viewer?page=2&itemsPerPage=4&page=3",
    );

    const resp = await middleware(req);
    expect(resp?.status).toBeGreaterThanOrEqual(300);
    expect(resp?.status).toBeLessThan(400);
    expect(resp?.headers.get("Location")).toBe(
      "https://www.example.com/ecr-viewer?page=2&itemsPerPage=4",
    );
  });

  it("should not redirect when params are good", async () => {
    const req = new NextRequest("https://www.example.com/ecr-viewer?page=3");

    const resp = await middleware(req);
    expect(resp?.status).toBe(200);
  });
});
