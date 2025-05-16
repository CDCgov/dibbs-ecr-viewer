/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

import { chainMiddleware } from "@/middleware";
import { withProcessZipRewrite } from "@/middlewares/withProcessZipRewrite";

const middleware = chainMiddleware([withProcessZipRewrite]);

describe("Process zip rewrite Middleware", () => {
  it("should rewrite process-zip to process-ecr", async () => {
    let message = "";
    jest.spyOn(console, "warn").mockImplementation((m) => {
      message = m;
    });
    const req = new NextRequest(
      "https://www.example.com/ecr-viewer/api/process-zip",
    );

    const resp = await middleware(req);
    expect(resp.status).toBe(200);
    expect(resp.headers.get("x-middleware-rewrite")).toEqual(
      "https://www.example.com/ecr-viewer/api/process-ecr",
    );
    expect(message).toEqual(
      "The `process-zip` API has been deprecated. Use `process-ecr` instead.",
    );
    jest.clearAllMocks();
  });

  it("should not rewrite when a non-process-zip-endpoint", async () => {
    const req = new NextRequest("https://www.example.com/ecr-viewer?page=3");

    const resp = await middleware(req);
    expect(resp.status).toBe(200);
    expect(resp.headers.get("x-middleware-rewrite")).toBeNull();
  });
});
