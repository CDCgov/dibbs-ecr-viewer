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
  deleteFromStorage,
  saveToStorage,
  saveWithMetadata,
} from "@/app/services/saveFhirDataService";
import { S3_SOURCE } from "@/app/data/blobStorage/utils";
import { getDb } from "@/app/data/metadataDb/database";

jest.mock("@/app/services/saveFhirDataService");
jest.mock("@/app/data/metadataDb/database", () => ({
  getDb: jest.fn(),
}));

const mockAgent = new MockAgent();
mockAgent.disableNetConnect();

describe("orchestrationRequest", () => {
  let mockFile: File;
  const mockEcr = {
    id: "123",
    identifier: { system: "hello", value: "world" },
  };
  const mockMetadata = { key: "value" };

  let mockPool: Interceptable;

  beforeAll(async () => {
    process.env.SOURCE = S3_SOURCE;
    process.env.ORCHESTRATION_URL = "http://orchestration-service";

    const zip = new JSZip();
    zip.file(
      "ecr.xml",
      `<ClinicalDocument xmlns="urn:hl7-org:v3"><id root="test-root" extension="test-ext" /></ClinicalDocument>`,
    );
    const buf = await zip.generateAsync({ type: "nodebuffer" });
    mockFile = new File([buf as BlobPart], "test.zip", {
      type: "application/zip",
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.METADATA_DATABASE_TYPE;
    delete process.env.METADATA_DATABASE_SCHEMA;
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

    expect(response).toStrictEqual({
      status: 200,
      message: "Success",
      message_in_timestamp: expect.any(String),
      message_out_timestamp: expect.any(String),
    });
    expect(saveWithMetadata).toHaveBeenCalledWith(
      mockEcr,
      "hello^world",
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

    expect(response).toStrictEqual({
      status: 200,
      message: "Success",
      message_in_timestamp: expect.any(String),
      message_out_timestamp: expect.any(String),
    });
    expect(saveToStorage).toHaveBeenCalledWith(
      mockEcr,
      "hello^world",
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
      message_in_timestamp: expect.any(String),
      message_out_timestamp: expect.any(String),
    });
    expect(saveToStorage).toHaveBeenCalledWith(
      mockEcr,
      "hello^world",
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
      message_in_timestamp: expect.any(String),
      message_out_timestamp: expect.any(String),
    });
  });

  it("reports its own message_in/out timestamps when the request to orchestration never gets a response", async () => {
    mockPool
      .intercept({
        path: "/process-zip",
        method: "POST",
      })
      .replyWithError(new Error("fetch failed"));

    jest.spyOn(console, "error").mockImplementation(() => {});

    const response = await orchestrationRequest(
      { ecr: mockFile },
      false,
      mockAgent as unknown as Agent,
    );

    expect(response).toEqual({
      message: "fetch failed",
      status: 500,
      message_in_timestamp: expect.any(String),
      message_out_timestamp: expect.any(String),
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
      message_in_timestamp: expect.any(String),
      message_out_timestamp: expect.any(String),
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
      message_in_timestamp: expect.any(String),
      message_out_timestamp: expect.any(String),
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
      message_in_timestamp: expect.any(String),
      message_out_timestamp: expect.any(String),
    });
  });

  describe("early duplicate check", () => {
    const fhirEcrId = "db734647-fc99-424c-a864-7e3cda82e703";
    const xmlBody = {
      ecr: `<ClinicalDocument xmlns="urn:hl7-org:v3"><id root="test-root" extension="test-ext" /></ClinicalDocument>`,
    };
    const fhirXmlBody = {
      ecr: `<Bundle xmlns="http://hl7.org/fhir"><identifier><system value="urn:ietf:rfc:3986"/><value value="urn:uuid:${fhirEcrId}"/></identifier><type value="document"/></Bundle>`,
    };

    //mock database query chain, configure how many records query should return
    const makeDbMock = (count: number) => {
      const chain = {
        selectFrom: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        executeTakeFirst: jest.fn().mockResolvedValue({ num_ecr: count }),
      };
      (getDb as jest.Mock).mockReturnValue(chain);
      return chain;
    };

    afterEach(() => {
      delete process.env.METADATA_DATABASE_TYPE;
    });

    it("returns 409 for duplicate C-CDA without calling orchestration", async () => {
      process.env.METADATA_DATABASE_TYPE = "postgres";
      const dbChain = makeDbMock(1);

      const response = await orchestrationRequest(
        xmlBody,
        false,
        mockAgent as unknown as Agent,
        true,
      );

      expect(response).toEqual({
        message: "eCR already loaded: test-root^test-ext",
        status: 409,
      });
      expect(dbChain.where).toHaveBeenCalledWith(
        "ecr_data.eicr_id",
        "=",
        "test-root^test-ext",
      );
      expect(saveWithMetadata).not.toHaveBeenCalled();
      expect(saveToStorage).not.toHaveBeenCalled();
    });

    it("returns 409 for duplicate FHIR XML without calling orchestration", async () => {
      process.env.METADATA_DATABASE_TYPE = "postgres";
      const dbChain = makeDbMock(1);

      const response = await orchestrationRequest(
        fhirXmlBody,
        false,
        mockAgent as unknown as Agent,
        true,
      );

      expect(response).toEqual({
        message: `eCR already loaded: ${fhirEcrId}`,
        status: 409,
      });
      expect(dbChain.where).toHaveBeenCalledWith(
        "ecr_data.eicr_id",
        "=",
        fhirEcrId,
      );
      expect(saveWithMetadata).not.toHaveBeenCalled();
      expect(saveToStorage).not.toHaveBeenCalled();
    });

    it("uses the same normalized FHIR identifier for lookup and persistence", async () => {
      process.env.METADATA_DATABASE_TYPE = "postgres";
      const dbChain = makeDbMock(0);
      const convertedEcr = {
        ...mockEcr,
        identifier: {
          system: "urn:ietf:rfc:3986",
          value: `urn:uuid:${fhirEcrId}`,
        },
      };

      mockPool
        .intercept({ path: "/process-message", method: "POST" })
        .reply(200, {
          processed_values: {
            responses: [{ stamped_ecr: { extended_bundle: convertedEcr } }],
          },
        });
      (saveToStorage as jest.Mock).mockResolvedValue({
        status: 200,
        message: "Success",
      });

      await orchestrationRequest(
        fhirXmlBody,
        false,
        mockAgent as unknown as Agent,
      );

      expect(dbChain.where).toHaveBeenCalledWith(
        "ecr_data.eicr_id",
        "=",
        fhirEcrId,
      );
      expect(saveToStorage).toHaveBeenCalledWith(
        convertedEcr,
        fhirEcrId,
        S3_SOURCE,
        "fhir",
      );
    });

    it("proceeds with orchestration when ECR does not exist in DB", async () => {
      process.env.METADATA_DATABASE_TYPE = "postgres";
      makeDbMock(0);

      mockPool
        .intercept({ path: "/process-message", method: "POST" })
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
        xmlBody,
        false,
        mockAgent as unknown as Agent,
      );

      expect(response).toEqual({
        status: 200,
        message: "Success",
        message_in_timestamp: expect.any(String),
        message_out_timestamp: expect.any(String),
      });
    });

    it("skips the check and proceeds when no DB is configured", async () => {
      delete process.env.METADATA_DATABASE_TYPE;

      mockPool
        .intercept({ path: "/process-message", method: "POST" })
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
        xmlBody,
        false,
        mockAgent as unknown as Agent,
      );

      expect(response).toEqual({
        status: 200,
        message: "Success",
        message_in_timestamp: expect.any(String),
        message_out_timestamp: expect.any(String),
      });
      expect(getDb).not.toHaveBeenCalled();
    });
  });

  describe("FHIR XML input", () => {
    const fhirXml =
      '<Bundle xmlns="http://hl7.org/fhir"><identifier><system value="source-system"/><value value="source-value"/></identifier><type value="document"/></Bundle>';

    afterEach(() => {
      delete process.env.METADATA_DATABASE_TYPE;
    });

    it("processes a FHIR XML string using the returned Bundle identifier", async () => {
      mockPool
        .intercept({ path: "/process-message", method: "POST" })
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
        { ecr: fhirXml },
        false,
        mockAgent as unknown as Agent,
      );

      expect(response).toEqual({
        status: 200,
        message: "Success",
        message_in_timestamp: expect.any(String),
        message_out_timestamp: expect.any(String),
      });
      expect(saveToStorage).toHaveBeenCalledWith(
        mockEcr,
        "hello^world",
        S3_SOURCE,
        "fhir",
      );
    });

    it("processes an application/fhir+xml File", async () => {
      mockPool
        .intercept({ path: "/process-message", method: "POST" })
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
        {
          ecr: new File([fhirXml], "ecr.xml", {
            type: "application/fhir+xml",
          }),
        },
        false,
        mockAgent as unknown as Agent,
      );

      expect(response.status).toBe(200);
      expect(saveToStorage).toHaveBeenCalledWith(
        mockEcr,
        "hello^world",
        S3_SOURCE,
        "fhir",
      );
    });
  });

  describe("XML save coordination", () => {
    const xmlBody = {
      ecr: `<ClinicalDocument xmlns="urn:hl7-org:v3"><id root="xml-root" extension="xml-ext" /></ClinicalDocument>`,
    };

    beforeEach(() => {
      jest.clearAllMocks();
      delete process.env.METADATA_DATABASE_TYPE;
    });

    afterEach(() => {
      jest.resetAllMocks();
    });

    it("saves XML in parallel with orchestration using the source document identifier", async () => {
      mockPool
        .intercept({ path: "/process-message", method: "POST" })
        .reply(200, {
          processed_values: {
            responses: [{ stamped_ecr: { extended_bundle: mockEcr } }],
          },
        });

      (saveToStorage as jest.Mock).mockResolvedValue({
        status: 200,
        message: "ok",
      });

      await orchestrationRequest(
        xmlBody,
        false,
        mockAgent as unknown as Agent,
        true,
      );

      const calls = (saveToStorage as jest.Mock).mock.calls;
      expect(
        calls.some(
          ([, id, , type]) => id === "xml-root^xml-ext" && type === "xml",
        ),
      ).toBe(true);
    });

    it("deletes XML when orchestration fails and XML save succeeded", async () => {
      mockPool
        .intercept({ path: "/process-message", method: "POST" })
        .reply(500, { detail: "fail" });

      (saveToStorage as jest.Mock).mockResolvedValue({
        status: 200,
        message: "XML saved",
      });
      jest.spyOn(console, "error").mockImplementation(() => {});

      const result = await orchestrationRequest(
        xmlBody,
        false,
        mockAgent as unknown as Agent,
        true,
      );

      expect(saveToStorage).toHaveBeenCalledWith(
        expect.any(Buffer),
        "xml-root^xml-ext",
        S3_SOURCE,
        "xml",
      );
      expect(deleteFromStorage).toHaveBeenCalledWith(
        "xml-root^xml-ext",
        S3_SOURCE,
        "xml",
      );
      expect(result.status).toBe(500);
    });

    it("deletes newly saved XML when FHIR persistence fails", async () => {
      mockPool
        .intercept({ path: "/process-message", method: "POST" })
        .reply(200, {
          processed_values: {
            responses: [{ stamped_ecr: { extended_bundle: mockEcr } }],
          },
        });

      (saveToStorage as jest.Mock).mockImplementation(
        async (_contents, _id, _source, type) =>
          type === "fhir"
            ? { status: 500, message: "FHIR storage failure" }
            : { status: 200, message: "XML saved" },
      );

      const result = await orchestrationRequest(
        xmlBody,
        false,
        mockAgent as unknown as Agent,
        true,
      );

      expect(deleteFromStorage).toHaveBeenCalledWith(
        "xml-root^xml-ext",
        S3_SOURCE,
        "xml",
      );
      expect(result).toEqual({
        message: "FHIR storage failure",
        status: 500,
        message_in_timestamp: expect.any(String),
        message_out_timestamp: expect.any(String),
      });
    });

    it("does not delete XML when orchestration and XML saves both fail", async () => {
      mockPool
        .intercept({ path: "/process-message", method: "POST" })
        .reply(500, { detail: "fail" });

      (saveToStorage as jest.Mock).mockRejectedValue(
        new Error("XML storage failure"),
      );
      jest.spyOn(console, "error").mockImplementation(() => {});

      const result = await orchestrationRequest(
        xmlBody,
        false,
        mockAgent as unknown as Agent,
        true,
      );

      expect(deleteFromStorage).not.toHaveBeenCalled();
      expect(result.status).toBe(500);
    });

    it("does not delete a pre-existing XML archive", async () => {
      mockPool
        .intercept({ path: "/process-message", method: "POST" })
        .reply(200, {
          processed_values: {
            responses: [{ stamped_ecr: { extended_bundle: mockEcr } }],
          },
        });

      (saveToStorage as jest.Mock).mockImplementation(
        async (_contents, _id, _source, type) =>
          type === "fhir"
            ? { status: 500, message: "FHIR storage failure" }
            : { status: 409, message: "XML already exists" },
      );

      const result = await orchestrationRequest(
        xmlBody,
        false,
        mockAgent as unknown as Agent,
        true,
      );

      expect(deleteFromStorage).not.toHaveBeenCalled();
      expect(result.status).toBe(500);
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
        messageInTimestamp: expect.any(String),
        messageOutTimestamp: expect.any(String),
      });
    });

    it("should call process zip for legacy octet-stream uploads", async () => {
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

      const octetStreamZip = new File(
        [await mockFile.arrayBuffer()],
        "test.zip",
        { type: "application/octet-stream" },
      );
      const response = await getOrchestrationResponse(
        { ecr: octetStreamZip },
        mockAgent as unknown as Agent,
      );

      expect(response.ecr).toEqual(mockEcr);
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
        messageInTimestamp: expect.any(String),
        messageOutTimestamp: expect.any(String),
      });
    });

    it("forwards FHIR XML unchanged for converter-side root detection", async () => {
      const fhirXml = `<?xml version="1.0" encoding="UTF-8"?>
<Bundle xmlns="http://hl7.org/fhir">
  <type value="document"/>
</Bundle>`;

      mockPool
        .intercept({
          path: "/process-message",
          method: "POST",
          body: JSON.stringify({
            message_type: "ecr",
            include_error_types: "[errors]",
            config_file_name: "bundle-only.json",
            data_type: "ecr",
            message: fhirXml,
          }),
        })
        .reply(200, {
          processed_values: {
            responses: [{ stamped_ecr: { extended_bundle: mockEcr } }],
          },
        });

      const response = await getOrchestrationResponse(
        { ecr: fhirXml },
        mockAgent as unknown as Agent,
      );

      expect(response.ecr).toEqual(mockEcr);
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
        messageInTimestamp: expect.any(String),
        messageOutTimestamp: expect.any(String),
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
        messageInTimestamp: expect.any(String),
        messageOutTimestamp: expect.any(String),
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
      delete process.env.METADATA_DATABASE_TYPE;
      delete process.env.METADATA_DATABASE_SCHEMA;

      const dbChain = {
        selectFrom: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        executeTakeFirst: jest.fn().mockResolvedValue({ num_ecr: 0 }),
      };
      (getDb as jest.Mock).mockReturnValue(dbChain);

      (saveToStorage as jest.Mock).mockResolvedValue({
        status: 200,
        message: "ok",
      });
      (saveWithMetadata as jest.Mock).mockResolvedValue({
        status: 200,
        message: "ok",
      });
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

    beforeEach(() => {
      jest.clearAllMocks();
      process.env.SOURCE = S3_SOURCE;
    });

    describe("zipAndSaveXml", () => {
      it("archives a FHIR XML string without changing its content", async () => {
        const fhirXml =
          '<Bundle xmlns="http://hl7.org/fhir"><type value="document"/></Bundle>';
        const body = { ecr: fhirXml };

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
        expect(Object.keys(zip.files)).toContain(`${ecrId}-eICR.xml`);
        expect(await zip.file(`${ecrId}-eICR.xml`)!.async("string")).toBe(
          fhirXml,
        );
      });

      it("zipAndSaveXml should include RR xml when ecr and rr are both strings", async () => {
        const body = {
          ecr: "<ClinicalDocument>eICR</ClinicalDocument>",
          rr: "<ReportabilityResponse>RR</ReportabilityResponse>",
        };

        await zipAndSaveXml(body, ecrId);

        const [zipBuffer] = (saveToStorage as jest.Mock).mock.calls[0];
        const zip = await JSZip.loadAsync(zipBuffer);
        const files = Object.keys(zip.files);
        expect(files).toContain(`${ecrId}-eICR.xml`);
        expect(files).toContain(`${ecrId}-RR.xml`);
      });

      it("zipAndSaveXml should take in a zip then call saveToStorage with a zipBuffer", async () => {
        const fakeZipBuffer = createFakeZip("<xml/>");
        const mockZip = new File([fakeZipBuffer as BlobPart], "test.zip", {
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
        expect(Object.keys(zip.files)).toContain(`${ecrId}-eICR.xml`);
      });
    });

    describe("unzipXml", () => {
      const xmlContent =
        '<ClinicalDocument xmlns="urn:hl7-org:v3"><id root="zip-root"/></ClinicalDocument>';

      afterEach(() => {
        jest.restoreAllMocks();
      });

      it("extracts XML from a valid legacy C-CDA ZIP", async () => {
        const zip = new JSZip();
        zip.file("CDA_eICR.xml", xmlContent);
        const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
        const zipFile = new File([zipBuffer as BlobPart], "test.zip", {
          type: "application/zip",
        });

        await expect(unzipXml(zipFile)).resolves.toBe(xmlContent);
      });

      it("prefers the eICR when the RR appears first in the ZIP", async () => {
        const zip = new JSZip();
        zip.file(
          "CDA_RR.xml",
          '<ClinicalDocument><id root="rr"/></ClinicalDocument>',
        );
        zip.file("CDA_eICR.xml", xmlContent);
        const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
        const zipFile = new File([zipBuffer as BlobPart], "test.zip", {
          type: "application/zip",
        });

        await expect(unzipXml(zipFile)).resolves.toBe(xmlContent);
      });

      it("throws when a ZIP contains no XML document", async () => {
        const fakeZipBuffer = createFakeZip("junk");
        const zipFile = new File([fakeZipBuffer as BlobPart], "test.zip", {
          type: "application/zip",
        });

        jest.spyOn(JSZip, "loadAsync").mockResolvedValue({
          files: {
            "junk.txt": { dir: false, async: jest.fn() },
          },
        } as any);

        await expect(unzipXml(zipFile)).rejects.toThrow(
          "No XML file found in the provided zip.",
        );
      });
    });

    describe("getEcrIdFromXml", () => {
      const ccdaXml = `
        <ClinicalDocument xmlns="urn:hl7-org:v3">
          <id root="1234-uuid" extension="bananas" />
        </ClinicalDocument>
      `;
      const fhirXml = `
        <Bundle xmlns="http://hl7.org/fhir">
          <identifier>
            <system value=" urn:oid:1.2.3.4 " />
            <value value=" fhir-extension " />
          </identifier>
          <type value="document" />
        </Bundle>
      `;

      it("extracts the direct ClinicalDocument ID", async () => {
        await expect(getEcrIdFromXml({ ecr: ccdaXml })).resolves.toBe(
          "1234-uuid^bananas",
        );
      });

      it("ignores nested C-CDA IDs before the document ID", async () => {
        const xml = `
          <ClinicalDocument xmlns="urn:hl7-org:v3">
            <entry><id root="wrong-id" /></entry>
            <id root="right-id" />
          </ClinicalDocument>
        `;

        await expect(getEcrIdFromXml({ ecr: xml })).resolves.toBe("right-id");
      });

      it("extracts and normalizes the direct FHIR Bundle identifier", async () => {
        await expect(getEcrIdFromXml({ ecr: fhirXml })).resolves.toBe(
          "1.2.3.4^fhir-extension",
        );
      });

      it("supports namespace-prefixed FHIR XML and ignores nested identifiers", async () => {
        const xml = `
          <f:Bundle xmlns:f="http://hl7.org/fhir">
            <f:id value="technical-resource-id" />
            <f:entry>
              <f:resource>
                <f:Patient>
                  <f:identifier>
                    <f:system value="wrong-system" />
                    <f:value value="wrong-value" />
                  </f:identifier>
                </f:Patient>
              </f:resource>
            </f:entry>
            <f:identifier>
              <f:system value="urn:uuid:right-root" />
              <f:value value="right-extension" />
            </f:identifier>
          </f:Bundle>
        `;

        await expect(getEcrIdFromXml({ ecr: xml })).resolves.toBe(
          "right-root^right-extension",
        );
      });

      it("extracts an identifier from an application/fhir+xml File", async () => {
        const xmlFile = new File([fhirXml], "ecr.xml", {
          type: "application/fhir+xml",
        });

        await expect(getEcrIdFromXml({ ecr: xmlFile })).resolves.toBe(
          "1.2.3.4^fhir-extension",
        );
      });

      it.each(["application/zip", "application/octet-stream"])(
        "extracts a C-CDA identifier from a %s ZIP",
        async (type) => {
          const zip = new JSZip();
          zip.file("ecr.xml", ccdaXml);
          const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
          const zipFile = new File([zipBuffer as BlobPart], "test.zip", {
            type,
          });

          await expect(getEcrIdFromXml({ ecr: zipFile })).resolves.toBe(
            "1234-uuid^bananas",
          );
        },
      );

      it("rejects a FHIR Bundle without a direct identifier", async () => {
        const xml = `
          <Bundle xmlns="http://hl7.org/fhir">
            <entry>
              <resource>
                <Patient>
                  <identifier>
                    <system value="nested-system" />
                    <value value="nested-value" />
                  </identifier>
                </Patient>
              </resource>
            </entry>
          </Bundle>
        `;

        await expect(getEcrIdFromXml({ ecr: xml })).rejects.toThrow(
          "Missing ECR identifier root and extension.",
        );
      });

      it("rejects unsupported XML root elements", async () => {
        await expect(
          getEcrIdFromXml({ ecr: '<Patient xmlns="http://hl7.org/fhir"/>' }),
        ).rejects.toThrow("Unsupported eCR XML root element: Patient.");
      });

      it("rejects unsupported file types", async () => {
        const invalidFile = new File(["data"], "test.txt", {
          type: "text/plain",
        });

        await expect(getEcrIdFromXml({ ecr: invalidFile })).rejects.toThrow(
          "Unsupported upload type. eCRs must be an XML string, XML file, or zipped XML file",
        );
      });

      it("rejects malformed XML", async () => {
        await expect(
          getEcrIdFromXml({ ecr: "<ClinicalDocument>" }),
        ).rejects.toThrow("unclosed tag");
      });
    });
  });
});
