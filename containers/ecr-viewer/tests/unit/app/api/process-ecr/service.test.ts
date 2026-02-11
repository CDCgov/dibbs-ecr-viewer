/**
 * @jest-environment node
 */

import JSZip from "jszip";
import { Agent, FormData, Interceptable, MockAgent } from "undici";

import { createFakeZip } from "../../../helpers";
import {
  createOrchestrationAgent,
  getEcrIdFromXml,
  getOrchestrationResponse,
  orchestrationRequest,
  unzipXml,
  zipAndSaveXml,
} from "@/app/api/process-ecr/service";
import {
  saveToStorage,
  saveWithMetadata,
} from "@/app/api/save-fhir-data/service";
import { S3_SOURCE } from "@/app/data/blobStorage/utils";

jest.mock("@/app/api/save-fhir-data/service");
jest.mock("@/app/data/metadataDb/database");

const mockAgent = new MockAgent();
mockAgent.disableNetConnect();

describe("orchestrationRequest", () => {
  const mockFile = new File(["content"], "test.zip", {
    type: "application/zip",
  });
  const mockEcr = { id: "123" };
  const mockMetadata = { key: "value" };

  let mockPool: Interceptable;

  beforeAll(() => {
    process.env.SOURCE = S3_SOURCE;
    process.env.ORCHESTRATION_URL = "http://orchestration-service";
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPool = mockAgent.get("http://orchestration-service");
  });

  it("should save file with metadata when orchestration response contains metadata", async () => {
    mockPool
      .intercept({
        path: "/process-zip",
        method: "POST",
      })
      .reply(200, {
        processed_values: {
          responses: [
            { stamped_ecr: { extended_bundle: mockEcr } },
            { metadata_values: { parsed_values: mockMetadata } },
          ],
        },
      });

    (saveWithMetadata as jest.Mock).mockResolvedValue({
      status: 200,
      message: "Success",
    });

    const response = await orchestrationRequest(
      { ecr: mockFile },
      false,
      mockAgent as unknown as Agent,
    );

    expect(response).toStrictEqual({ status: 200, message: "Success" });
    expect(saveWithMetadata).toHaveBeenCalledWith(
      mockEcr,
      "123",
      S3_SOURCE,
      mockMetadata,
    );
  });

  it("should save file without metadata when orchestration response does not contain metadata", async () => {
    mockPool
      .intercept({
        path: "/process-zip",
        method: "POST",
      })
      .reply(200, {
        processed_values: {
          responses: [{ stamped_ecr: { extended_bundle: mockEcr } }],
        },
      });

    (saveToStorage as jest.Mock).mockResolvedValue({
      status: 200,
      message: "Success",
    });

    const response = await orchestrationRequest(
      { ecr: mockFile },
      false,
      mockAgent as unknown as Agent,
    );

    expect(response).toStrictEqual({ status: 200, message: "Success" });
    expect(saveToStorage).toHaveBeenCalledWith(
      mockEcr,
      "123",
      S3_SOURCE,
      "fhir",
    );
  });

  it("should return fhir bundle when requested", async () => {
    mockPool
      .intercept({
        path: "/process-zip",
        method: "POST",
      })
      .reply(200, {
        processed_values: {
          responses: [{ stamped_ecr: { extended_bundle: mockEcr } }],
        },
      });

    (saveToStorage as jest.Mock).mockResolvedValue({
      status: 200,
      message: "Success",
    });

    const response = await orchestrationRequest(
      { ecr: mockFile },
      true,
      mockAgent as unknown as Agent,
    );

    expect(response).toStrictEqual({
      status: 200,
      message: "Success",
      bundle: mockEcr,
    });
    expect(saveToStorage).toHaveBeenCalledWith(
      mockEcr,
      "123",
      S3_SOURCE,
      "fhir",
    );
  });

  it("should return 500 status with received error details when orchestration response fails", async () => {
    mockPool
      .intercept({
        path: "/process-zip",
        method: "POST",
      })
      .reply(500, {
        detail: "Error",
      });

    jest.spyOn(console, "error").mockImplementation(() => {});

    const response = await orchestrationRequest(
      { ecr: mockFile },
      false,
      mockAgent as unknown as Agent,
    );

    expect(response).toEqual({
      message: "Error",
      status: 500,
    });
  });

  it("should return 500 status with received response text when orchestration response fails with unexpected response format", async () => {
    mockPool
      .intercept({
        path: "/process-zip",
        method: "POST",
      })
      .reply(500, {
        somethingElse: "Error",
      });

    jest.spyOn(console, "error").mockImplementation(() => {});

    const response = await orchestrationRequest(
      { ecr: mockFile },
      false,
      mockAgent as unknown as Agent,
    );

    expect(response).toEqual({
      message: '{"somethingElse":"Error"}',
      status: 500,
    });
  });

  it("should return 500 status with received response text when orchestration response fails with non-json response text", async () => {
    mockPool
      .intercept({
        path: "/process-zip",
        method: "POST",
      })
      .reply(500, "error");

    jest.spyOn(console, "error").mockImplementation(() => {});

    const response = await orchestrationRequest(
      { ecr: mockFile },
      false,
      mockAgent as unknown as Agent,
    );

    expect(response).toEqual({
      message: "error",
      status: 500,
    });
  });

  it("should return 500 status with default error details when orchestration response fails without error details", async () => {
    mockPool
      .intercept({
        path: "/process-zip",
        method: "POST",
      })
      .reply(500);

    jest.spyOn(console, "error").mockImplementation(() => {});

    const response = await orchestrationRequest(
      { ecr: mockFile },
      false,
      mockAgent as unknown as Agent,
    );

    expect(response).toEqual({
      message: "Failed to process orchestration response",
      status: 500,
    });
  });

  describe("createOrchestrationAgent", () => {
    describe("Default timeout path", () => {
      it("If ECR_PROCESSING_TIMEOUT is not set, defaults to 900000ms timeout when creating the orchestration Agent", () => {
        const agent = createOrchestrationAgent();

        const optsSym = Object.getOwnPropertySymbols(agent).find(
          (s) => s.toString() === "Symbol(options)",
        )!;
        const opts = (agent as any)[optsSym];

        expect(agent).toBeInstanceOf(Agent);
        expect(opts.headersTimeout).toBe(900000);
      });
    });

    describe("Env var timeout path", () => {
      afterEach(() => {
        delete process.env.ECR_PROCESSING_TIMEOUT;
      });
      it("uses ECR_PROCESSING_TIMEOUT when creating the orchestration Agent", () => {
        process.env.ECR_PROCESSING_TIMEOUT = "12345";

        const agent = createOrchestrationAgent();

        const optsSym = Object.getOwnPropertySymbols(agent).find(
          (s) => s.toString() === "Symbol(options)",
        )!;
        const opts = (agent as any)[optsSym];

        expect(agent).toBeInstanceOf(Agent);
        expect(opts.headersTimeout).toBe(12345);
      });
    });
  });

  describe("getOrchestrationResponse", () => {
    it("should call process zip when ecr is a zip", async () => {
      mockPool
        .intercept({
          path: "/process-zip",
          method: "POST",
        })
        .reply(200, {
          processed_values: {
            responses: [{ stamped_ecr: { extended_bundle: mockEcr } }],
          },
        });

      const response = await getOrchestrationResponse(
        { ecr: mockFile },
        mockAgent as unknown as Agent,
      );

      // If anything other than /process-zip is called the request will fail due to how undici's mocking works
      expect(response).toEqual({
        ecr: mockEcr,
        metadata: undefined,
      });
    });

    it("should handle string contents", async () => {
      mockPool
        .intercept({
          path: "/process-message",
          method: "POST",
        })
        .reply(200, {
          processed_values: {
            responses: [{ stamped_ecr: { extended_bundle: mockEcr } }],
          },
        });

      const response = await getOrchestrationResponse(
        { ecr: "ecr", rr: "rr" },
        mockAgent as unknown as Agent,
      );
      // If anything other than /process-message is called the request will fail due to how undici's mocking works
      expect(response).toEqual({
        ecr: mockEcr,
        metadata: undefined,
      });
    });

    it("should handle File contents", async () => {
      mockPool
        .intercept({
          path: "/process-message",
          method: "POST",
        })
        .reply(200, {
          processed_values: {
            responses: [{ stamped_ecr: { extended_bundle: mockEcr } }],
          },
        });

      const response = await getOrchestrationResponse(
        {
          ecr: new File(["ecr"], "ecr.xml"),
          rr: new File(["rr"], "rr.xml"),
        },
        mockAgent as unknown as Agent,
      );

      expect(response).toEqual({
        ecr: mockEcr,
        metadata: undefined,
      });
    });

    it("should handle undefined rr", async () => {
      mockPool
        .intercept({
          path: "/process-message",
          method: "POST",
        })
        .reply(200, {
          processed_values: {
            responses: [{ stamped_ecr: { extended_bundle: mockEcr } }],
          },
        });

      const response = await getOrchestrationResponse(
        {
          ecr: new File(["ecr"], "ecr.xml"),
          rr: undefined,
        },
        mockAgent as unknown as Agent,
      );

      expect(response).toEqual({
        ecr: mockEcr,
        metadata: undefined,
      });
    });
  });

  describe("orchestrationConfig", () => {
    let appendMock: jest.SpyInstance;

    beforeEach(() => {
      mockPool
        .intercept({
          path: "/process-zip",
          method: "POST",
        })
        .reply(200, {
          processed_values: {
            responses: [
              { stamped_ecr: { extended_bundle: mockEcr } },
              { metadata_values: mockMetadata },
            ],
          },
        });

      appendMock = jest.spyOn(FormData.prototype, "append");
      process.env.METADATA_DATABASE_TYPE = undefined;
      process.env.METADATA_DATABASE_SCHEMA = undefined;
    });
    it("should use bundle-only.json when no metadata db", async () => {
      delete process.env.METADATA_DATABASE_TYPE;
      delete process.env.METADATA_DATABASE_SCHEMA;

      await orchestrationRequest(
        { ecr: mockFile },
        false,
        mockAgent as unknown as Agent,
      );

      expect(appendMock).toHaveBeenCalledWith(
        "config_file_name",
        "bundle-only.json",
      );
    });
    it("should use bundle-metadata-extended.json when metadata db exists and metadata is extended ", async () => {
      process.env.METADATA_DATABASE_TYPE = "postgres";
      process.env.METADATA_DATABASE_SCHEMA = "extended";

      await orchestrationRequest(
        { ecr: mockFile },
        false,
        mockAgent as unknown as Agent,
      );

      expect(appendMock).toHaveBeenCalledWith(
        "config_file_name",
        "bundle-metadata-extended.json",
      );
    });
    it("should use bundle-metadata-core.json when metadata db exists and metadata is core ", async () => {
      process.env.METADATA_DATABASE_TYPE = "postgres";
      process.env.METADATA_DATABASE_SCHEMA = "core";

      await orchestrationRequest(
        { ecr: mockFile },
        false,
        mockAgent as unknown as Agent,
      );

      expect(appendMock).toHaveBeenCalledWith(
        "config_file_name",
        "bundle-metadata-core.json",
      );
    });
  });

  describe("XML saving functions", () => {
    const ecrId = "test-ecr-id";
    const xmlContent = "<ClinicalDocument>Inside ZIP</ClinicalDocument>";

    beforeEach(() => {
      jest.clearAllMocks();
      process.env.SOURCE = S3_SOURCE;
    });

    describe("zipAndSaveXml", () => {
      it("zipAndSaveXml should take in an xml string then call saveToStorage with a zipBuffer", async () => {
        const body = { ecr: "<ClinicalDocument>Fake XML</ClinicalDocument>" };

        await zipAndSaveXml(body, ecrId);

        expect(saveToStorage).toHaveBeenCalledTimes(1);

        const [zipBuffer, passedId, source, type] = (saveToStorage as jest.Mock)
          .mock.calls[0];

        expect(passedId).toBe(ecrId);
        expect(source).toBe(S3_SOURCE);
        expect(type).toBe("xml");

        expect(Buffer.isBuffer(zipBuffer)).toBe(true);
        // Confirm it's a zip
        expect(zipBuffer.slice(0, 2).toString("hex")).toBe("504b");

        const zip = await JSZip.loadAsync(zipBuffer);
        expect(Object.keys(zip.files)).toContain(`${ecrId}-CDA_eICR.xml`);
      });

      it("zipAndSaveXml should take in a zip then call saveToStorage with a zipBuffer", async () => {
        const fakeZipBuffer = createFakeZip("<xml/>");
        const mockZip = new File([fakeZipBuffer], "test.zip", {
          type: "application/zip",
        });

        const body = { ecr: mockZip };

        await zipAndSaveXml(body, ecrId);

        expect(saveToStorage).toHaveBeenCalledTimes(1);

        const [bufferArg, passedId, source, type] = (saveToStorage as jest.Mock)
          .mock.calls[0];

        expect(passedId).toBe(ecrId);
        expect(source).toBe(S3_SOURCE);
        expect(type).toBe("xml");

        expect(Buffer.isBuffer(bufferArg)).toBe(true);
        // Confirm it's a zip
        expect(bufferArg.slice(0, 2).toString("hex")).toBe("504b");
      });

      it("zipAndSaveXml should take in a file then call saveToStorage with a zipBuffer", async () => {
        const mockFile = new File(
          ["<ClinicalDocument>From File</ClinicalDocument>"],
          "ecr.xml",
          { type: "application/xml" },
        );

        const body = { ecr: mockFile };

        await zipAndSaveXml(body, ecrId);

        expect(saveToStorage).toHaveBeenCalledTimes(1);

        const [zipBuffer, passedId, source, type] = (saveToStorage as jest.Mock)
          .mock.calls[0];

        expect(passedId).toBe(ecrId);
        expect(source).toBe(S3_SOURCE);
        expect(type).toBe("xml");

        expect(Buffer.isBuffer(zipBuffer)).toBe(true);
        // Confirm it's a zip
        expect(zipBuffer.slice(0, 2).toString("hex")).toBe("504b");

        const zip = await JSZip.loadAsync(zipBuffer);
        expect(Object.keys(zip.files)).toContain(`${ecrId}-CDA_eICR.xml`);
      });
    });

    describe("unzipXml", () => {
      it("should extract the xml string from a valid zip", async () => {
        const fakeZipBuffer = createFakeZip(xmlContent);
        const mockFile = new File([fakeZipBuffer], "test.zip", {
          type: "application/zip",
        });

        const loadSpy = jest.spyOn(JSZip, "loadAsync").mockResolvedValue({
          files: {
            "CDA_eICR.xml": {
              dir: false,
              async: jest.fn().mockResolvedValue(xmlContent),
            },
          },
        } as any);

        const result = await unzipXml(mockFile);

        expect(loadSpy).toHaveBeenCalledTimes(1);
        expect(result).toBe(xmlContent);
      });

      it("should throw when no XML file is found", async () => {
        const fakeZipBuffer = createFakeZip("junk");
        const mockFile = new File([fakeZipBuffer], "test.zip", {
          type: "application/zip",
        });

        jest.spyOn(JSZip, "loadAsync").mockResolvedValue({
          files: {
            "junk.txt": { dir: false, async: jest.fn() },
          },
        } as any);

        await expect(unzipXml(mockFile)).rejects.toThrow(
          "No XML file found in the provided zip.",
        );
      });

      afterEach(() => {
        jest.restoreAllMocks(); // restore JSZip.loadAsync for following tests
      });
    });

    describe("getEcrIdFromXml", () => {
      const xmlString = `
    <ClinicalDocument>
      <id root="1234-uuid" extension="bananas" />
    </ClinicalDocument>
  `;

      it("extracts ID when ecr is a string", async () => {
        const result = await getEcrIdFromXml({ ecr: xmlString } as any);
        expect(result).toBe("1234-uuid^bananas");
      });

      it("extracts ID when ecr is an XML file", async () => {
        const xmlFile = new File([xmlString], "test.xml", {
          type: "application/xml",
        });
        const result = await getEcrIdFromXml({ ecr: xmlFile } as any);
        expect(result).toBe("1234-uuid^bananas");
      });

      it("extracts ID when ecr is a zipped XML file", async () => {
        const zip = new JSZip();
        zip.file("whatever.xml", xmlString);
        const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

        const zipFile = new File([zipBuffer], "test.zip", {
          type: "application/zip",
        });

        const result = await getEcrIdFromXml({ ecr: zipFile } as any);
        expect(result).toBe("1234-uuid^bananas");
      });

      it("throws for unsupported upload types", async () => {
        const invalidFile = new File(["data"], "test.txt", {
          type: "text/plain",
        });
        await expect(
          getEcrIdFromXml({ ecr: invalidFile } as any),
        ).rejects.toThrow(
          "Unsupported upload type. eCRs must be an XML string, XML file, or zipped XML file",
        );
      });
    });
  });
});
