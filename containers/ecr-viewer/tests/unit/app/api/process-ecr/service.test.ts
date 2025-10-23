/**
 * @jest-environment node
 */

import { Agent, FormData, Interceptable, MockAgent } from 'undici'

import {
  getOrchestrationResponse,
  orchestrationRequest,
} from "@/app/api/process-ecr/service";
import {
  saveFhirData,
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
    mockPool = mockAgent.get('http://orchestration-service');
  });

  it("should save file with metadata when orchestration response contains metadata", async () => {
    mockPool.intercept({
      path: '/process-zip',
      method: 'POST',
    }).reply(200, {
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

    const response = await orchestrationRequest({ ecr: mockFile }, false, mockAgent as unknown as Agent);

    expect(response).toStrictEqual({ status: 200, message: "Success" });
    expect(saveWithMetadata).toHaveBeenCalledWith(
      mockEcr,
      "123",
      S3_SOURCE,
      mockMetadata,
    );
  });

  it("should save file without metadata when orchestration response does not contain metadata", async () => {
    mockPool.intercept({
      path: '/process-zip',
      method: 'POST',
    }).reply(200, {
        processed_values: {
          responses: [{ stamped_ecr: { extended_bundle: mockEcr } }],
        },
    });

    (saveFhirData as jest.Mock).mockResolvedValue({
      status: 200,
      message: "Success",
    });

    const response = await orchestrationRequest({ ecr: mockFile }, false, mockAgent as unknown as Agent);

    expect(response).toStrictEqual({ status: 200, message: "Success" });
    expect(saveFhirData).toHaveBeenCalledWith(mockEcr, "123", S3_SOURCE);
  });

  it("should return fhir bundle when requested", async () => {
    mockPool.intercept({
      path: '/process-zip',
      method: 'POST',
    }).reply(200, {
        processed_values: {
          responses: [{ stamped_ecr: { extended_bundle: mockEcr } }],
        },
    });

    (saveFhirData as jest.Mock).mockResolvedValue({
      status: 200,
      message: "Success",
    });

    const response = await orchestrationRequest({ ecr: mockFile }, true, mockAgent as unknown as Agent);

    expect(response).toStrictEqual({
      status: 200,
      message: "Success",
      bundle: mockEcr,
    });
    expect(saveFhirData).toHaveBeenCalledWith(mockEcr, "123", S3_SOURCE);
  });

  it("should return 500 status when orchestration response fails", async () => {
    mockPool.intercept({
      path: '/process-zip',
      method: 'POST',
    }).reply(500, {
        message: "Error" ,
    });

    jest.spyOn(console, "error").mockImplementation(() => {});

    const response = await orchestrationRequest({ ecr: mockFile }, false, mockAgent as unknown as Agent);

    expect(response).toEqual({
      message: "Failed to process orchestration response",
      status: 500,
    });
  });

  describe("getOrchestrationResponse", () => {
    it("should call process zip when ecr is a zip", async () => {
      mockPool.intercept({
        path: '/process-zip',
        method: 'POST',
      }).reply(200, {
          processed_values: {
            responses: [{ stamped_ecr: { extended_bundle: mockEcr } }],
          },
      });

      const response = await getOrchestrationResponse({ ecr: mockFile }, mockAgent as unknown as Agent);

      // If anything other than /process-zip is called the request will fail due to how undici's mocking works
      expect(response).toEqual({
        "ecr": mockEcr,
        "metadata": undefined,
      });
    });

    it("should handle string contents", async () => {
      mockPool.intercept({
        path: '/process-message',
        method: 'POST',
      }).reply(200, {
          processed_values: {
            responses: [{ stamped_ecr: { extended_bundle: mockEcr } }],
          },
      });

      const response = await getOrchestrationResponse({ ecr: "ecr", rr: "rr" }, mockAgent as unknown as Agent);
      // If anything other than /process-message is called the request will fail due to how undici's mocking works
      expect(response).toEqual({
        "ecr": mockEcr,
        "metadata": undefined,
      });
    });

    it("should handle File contents", async () => {
      mockPool.intercept({
        path: '/process-message',
        method: 'POST',
      }).reply(200, {
          processed_values: {
            responses: [{ stamped_ecr: { extended_bundle: mockEcr } }],
          },
      });

      const response = await getOrchestrationResponse({
        ecr: new File(["ecr"], "ecr.xml"),
        rr: new File(["rr"], "rr.xml"),
      }, mockAgent as unknown as Agent);
      
      expect(response).toEqual({
        "ecr": mockEcr,
        "metadata": undefined,
      });
    });

    it("should handle undefined rr", async () => {
      mockPool.intercept({
        path: '/process-message',
        method: 'POST',
      }).reply(200, {
          processed_values: {
            responses: [{ stamped_ecr: { extended_bundle: mockEcr } }],
          },
      });

      const response = await getOrchestrationResponse({
        ecr: new File(["ecr"], "ecr.xml"),
        rr: undefined,
      }, mockAgent as unknown as Agent);
      
      expect(response).toEqual({
        "ecr": mockEcr,
        "metadata": undefined,
      });
    });
  });

  describe("orchestrationConfig", () => {
    let appendMock: jest.SpyInstance;

    beforeEach(() => {
      mockPool.intercept({
        path: '/process-zip',
        method: 'POST',
      }).reply(200, {
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

      await orchestrationRequest({ ecr: mockFile }, false, mockAgent as unknown as Agent);

      expect(appendMock).toHaveBeenCalledWith(
        "config_file_name",
        "bundle-only.json",
      );
    });
    it("should use bundle-metadata-extended.json when metadata db exists and metadata is extended ", async () => {
      process.env.METADATA_DATABASE_TYPE = "postgres";
      process.env.METADATA_DATABASE_SCHEMA = "extended";

      await orchestrationRequest({ ecr: mockFile }, false, mockAgent as unknown as Agent);

      expect(appendMock).toHaveBeenCalledWith(
        "config_file_name",
        "bundle-metadata-extended.json",
      );
    });
    it("should use bundle-metadata-core.json when metadata db exists and metadata is core ", async () => {
      process.env.METADATA_DATABASE_TYPE = "postgres";
      process.env.METADATA_DATABASE_SCHEMA = "core";

      await orchestrationRequest({ ecr: mockFile }, false, mockAgent as unknown as Agent);

      expect(appendMock).toHaveBeenCalledWith(
        "config_file_name",
        "bundle-metadata-core.json",
      );
    });
  });
});
