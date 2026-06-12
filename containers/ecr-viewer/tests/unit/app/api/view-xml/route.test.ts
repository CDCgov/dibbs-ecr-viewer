/**
 * @jest-environment node
 */

import JSZip from "jszip";
import { NextRequest } from "next/server";

import { s3Client } from "@/app/data/blobStorage/s3Client";
import { GET } from "@/app/api/view-xml/route";

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
    `http://localhost:3000/ecr-viewer/api/view-xml${id ? `?id=${id}` : ""}`,
  );

describe("GET /api/view-xml", () => {
  const ORIG_ENV = { ...process.env };

  beforeEach(() => {
    process.env.SAVE_XML = "true";
    process.env.SOURCE = "s3";
    process.env.ECR_BUCKET_NAME = "ecr-viewer-files";
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = { ...ORIG_ENV };
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

  it("returns 501 when SOURCE is not s3", async () => {
    process.env.SOURCE = "azure";
    const response = await GET(makeRequest("abc"));
    expect(response.status).toBe(501);
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
