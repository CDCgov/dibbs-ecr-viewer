/**
 * @jest-environment node
 */

import { jwtVerify } from "jose";
import JSZip from "jszip";
import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import { s3Client } from "@/app/data/blobStorage/s3Client";
import { isLoggedInUserEcrAuthed } from "@/app/services/userService";
import { getLoggedInUserSession } from "@/app/utils/auth-utils";
import { GET } from "@/app/view-data/view-xml/route";
import { chainProxy } from "@/proxy";
import { withJwtAuth } from "@/proxy/withJwtAuth";
import { withNextAuth } from "@/proxy/withNextAuth";
import { withUnauthorized } from "@/proxy/withUnauthorized";

jest.mock("@/app/services/userService");
jest.mock("@/app/utils/auth-utils");
jest.mock("next-auth/jwt", () => ({ getToken: jest.fn() }));
jest.mock("jose", () => ({
  importSPKI: jest.fn().mockResolvedValue("mock-key"),
  jwtVerify: jest.fn(),
  createLocalJWKSet: jest.fn(),
}));

jest.mock("@/app/data/blobStorage/s3Client", () => ({
  s3Client: { send: jest.fn() },
}));

const makeZipBody = async (files: Record<string, string>) => {
  const zip = new JSZip();
  for (const [name, content] of Object.entries(files)) {
    zip.file(name, content);
  }
  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  return { transformToByteArray: () => Promise.resolve(buffer) };
};

const makeRequest = (id?: string) =>
  new NextRequest(
    `http://localhost:3000/ecr-viewer/view-data/view-xml${id ? `?id=${id}` : ""}`,
  );

const authenticatedGet = chainProxy(
  [withJwtAuth, withNextAuth, withUnauthorized],
  GET,
);

describe("GET /view-data/view-xml", () => {
  const ORIG_ENV = { ...process.env };

  beforeEach(() => {
    process.env.SAVE_XML = "true";
    process.env.SOURCE = "s3";
    process.env.ECR_BUCKET_NAME = "ecr-viewer-files";
    process.env.AUTH_PROVIDER = "keycloak";
    process.env.NEXTAUTH_SECRET = "test-secret";
    process.env.BASE_PATH = "/ecr-viewer";
    delete process.env.JWT_PUB_KEY;
    delete process.env.JWT_API_PUB_KEY;
    delete process.env.NBS_PUB_KEY;
    delete process.env.NBS_API_PUB_KEY;
    jest.clearAllMocks();
    jest.mocked(getLoggedInUserSession).mockResolvedValue({
      email: "standard@example.com",
    });
    jest.mocked(isLoggedInUserEcrAuthed).mockResolvedValue(true);
    jest.mocked(getToken).mockResolvedValue(null);
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = { ...ORIG_ENV };
    jest.restoreAllMocks();
  });

  it("returns 404 when SAVE_XML is not enabled", async () => {
    process.env.SAVE_XML = "false";
    const response = await GET(makeRequest("abc"));
    expect(response.status).toBe(404);
  });

  it("returns 400 when id param is missing", async () => {
    const response = await GET(makeRequest());
    expect(response.status).toBe(400);
  });

  it("denies a request to view XML for an eCR outside the user's program area", async () => {
    jest.mocked(isLoggedInUserEcrAuthed).mockResolvedValue(false);

    const response = await GET(makeRequest("cross-area-ecr"));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ message: "XML archive not found" });
  });

  it("returns a 500 when authorization fails with an error", async () => {
    jest
      .mocked(isLoggedInUserEcrAuthed)
      .mockRejectedValueOnce(new Error("Authorization unavailable"));

    const response = await GET(makeRequest("abc"));

    expect(response.status).toBe(500);
  });

  it("redirects anonymous XML requests before reaching the route", async () => {
    jest.mocked(getLoggedInUserSession).mockResolvedValue(undefined);

    const response = await authenticatedGet(makeRequest("abc"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/signin");
  });

  // JWT payload {} emulates NBS flow
  // JWT payload { ecr_id: "abc" } emulates Epitrax flow
  it.each([{}, { ecr_id: "abc" }])(
    "preserves XML access with a verified JWT payload %j",
    async (payload) => {
      process.env.JWT_PUB_KEY = "mock-pub-key";
      jest.mocked(getLoggedInUserSession).mockResolvedValue(undefined);
      jest.mocked(isLoggedInUserEcrAuthed).mockResolvedValue(false);
      (jwtVerify as jest.Mock).mockResolvedValue({ payload });
      const body = await makeZipBody({
        "abc-CDA_eICR.xml": "<ClinicalDocument/>",
        "abc-CDA_RR.xml": "<ReportabilityResponse/>",
      });
      (s3Client.send as jest.Mock).mockResolvedValue({ Body: body });
      const request = makeRequest("abc");
      request.cookies.set("jwt-auth-token", "synthetic-token");
      request.cookies.set("jwt-ecr-id", "abc");

      const response = await authenticatedGet(request);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        ecrXml: "<ClinicalDocument/>",
        rrXml: "<ReportabilityResponse/>",
      });
    },
  );

  it("returns 404 when storage client is not configured", async () => {
    process.env.SOURCE = "azure";
    const response = await GET(makeRequest("abc"));
    expect(response.status).toBe(404);
  });

  it("returns 404 when S3 returns no Body", async () => {
    (s3Client.send as jest.Mock).mockResolvedValue({ Body: null });
    const response = await GET(makeRequest("abc"));
    expect(response.status).toBe(404);
  });

  it("returns 404 when no XML files are found in the zip", async () => {
    const body = await makeZipBody({ "other-file.xml": "<root/>" });
    (s3Client.send as jest.Mock).mockResolvedValue({ Body: body });
    const response = await GET(makeRequest("abc"));
    expect(response.status).toBe(404);
  });

  it("returns 200 with JSON containing ecrXml and rrXml", async () => {
    const ecrXml = '<?xml version="1.0"?><ClinicalDocument/>';
    const rrXml = '<?xml version="1.0"?><ReportabilityResponse/>';
    const body = await makeZipBody({
      "abc-CDA_eICR.xml": ecrXml,
      "abc-CDA_RR.xml": rrXml,
    });
    (s3Client.send as jest.Mock).mockResolvedValue({ Body: body });

    const response = await GET(makeRequest("abc"));
    expect(response.status).toBe(200);
    expect(isLoggedInUserEcrAuthed).toHaveBeenCalledWith("abc");
    expect(response.headers.get("Content-Type")).toContain("application/json");
    const data = await response.json();
    expect(data.ecrXml).toBe(ecrXml);
    expect(data.rrXml).toBe(rrXml);
  });

  it("returns null rrXml when only eICR XML exists", async () => {
    const body = await makeZipBody({
      "abc-CDA_eICR.xml": "<ClinicalDocument/>",
    });
    (s3Client.send as jest.Mock).mockResolvedValue({ Body: body });

    const response = await GET(makeRequest("abc"));
    const data = await response.json();
    expect(data.ecrXml).not.toBeNull();
    expect(data.rrXml).toBeNull();
  });

  it("returns 500 when S3 throws", async () => {
    (s3Client.send as jest.Mock).mockRejectedValue(new Error("S3 error"));
    const response = await GET(makeRequest("abc"));
    expect(response.status).toBe(500);
  });
});
