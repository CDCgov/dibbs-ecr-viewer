/**
 * @jest-environment node
 */

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

describe("orchestrationRequest", () => {
  const mockFile = new File(["content"], "test.zip", {
    type: "application/zip",
  });
  const mockEcr = { entry: [{ resource: { id: "123" } }] };
  const mockMetadata = { key: "value" };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SOURCE = S3_SOURCE;
  });

  it("should save file with metadata when orchestration response contains metadata", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 200,
      json: jest.fn().mockResolvedValue({
        processed_values: {
          responses: [
            { stamped_ecr: { extended_bundle: mockEcr } },
            { metadata_values: { parsed_values: mockMetadata } },
          ],
        },
      }),
    });
    (saveWithMetadata as jest.Mock).mockResolvedValue({
      status: 200,
      message: "Success",
    });

    const response = await orchestrationRequest({ ecr: mockFile }, false);

    expect(response).toStrictEqual({ status: 200, message: "Success" });
    expect(saveWithMetadata).toHaveBeenCalledWith(
      mockEcr,
      "123",
      S3_SOURCE,
      mockMetadata,
    );
  });

  it("should save file without metadata when orchestration response does not contain metadata", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 200,
      json: jest.fn().mockResolvedValue({
        processed_values: {
          responses: [{ stamped_ecr: { extended_bundle: mockEcr } }],
        },
      }),
    });
    (saveFhirData as jest.Mock).mockResolvedValue({
      status: 200,
      message: "Success",
    });

    const response = await orchestrationRequest({ ecr: mockFile }, false);

    expect(response).toStrictEqual({ status: 200, message: "Success" });
    expect(saveFhirData).toHaveBeenCalledWith(mockEcr, "123", S3_SOURCE);
  });

  it("should return fhir bundle when requested", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 200,
      json: jest.fn().mockResolvedValue({
        processed_values: {
          responses: [{ stamped_ecr: { extended_bundle: mockEcr } }],
        },
      }),
    });
    (saveFhirData as jest.Mock).mockResolvedValue({
      status: 200,
      message: "Success",
    });

    const response = await orchestrationRequest({ ecr: mockFile }, true);

    expect(response).toStrictEqual({
      status: 200,
      message: "Success",
      bundle: mockEcr,
    });
    expect(saveFhirData).toHaveBeenCalledWith(mockEcr, "123", S3_SOURCE);
  });

  it("should return 500 status when orchestration response fails", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 500,
      json: jest.fn().mockResolvedValue({ message: "Error" }),
    });
    jest.spyOn(console, "error").mockImplementation(() => {});

    const response = await orchestrationRequest({ ecr: mockFile }, false);

    expect(response).toEqual({
      message: "Failed to process orchestration response",
      status: 500,
    });
  });

  describe("getOrchestrationResponse", () => {
    it("should call process zip when ecr is a zip", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        json: jest.fn().mockResolvedValue({
          processed_values: {
            responses: [{ stamped_ecr: { extended_bundle: mockEcr } }],
          },
        }),
      });

      await getOrchestrationResponse({ ecr: mockFile });
      const args = (global.fetch as jest.Mock).mock.calls[0];
      expect(args[0]).toEndWith("process-zip");
      expect(args[1].body).toBeInstanceOf(FormData);
      const headers = args[1].headers;
      expect([...headers.entries()]).toBeArrayOfSize(0);
    });

    it("should handle string contents", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        json: jest.fn().mockResolvedValue({
          processed_values: {
            responses: [{ stamped_ecr: { extended_bundle: mockEcr } }],
          },
        }),
      });

      await getOrchestrationResponse({ ecr: "ecr", rr: "rr" });
      const args = (global.fetch as jest.Mock).mock.calls[0];
      expect(args[0]).toEndWith("process-message");
      const body = args[1].body;
      expect(body).toEqual(
        '{"message_type":"ecr","include_error_types":"[errors]","config_file_name":"bundle-only.json","data_type":"ecr","message":"ecr","rr_data":"rr"}',
      );
      const headers = args[1].headers;
      expect([...headers.entries()]).toStrictEqual([
        ["content-type", "application/json"],
      ]);
    });

    it("should handle File contents", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        json: jest.fn().mockResolvedValue({
          processed_values: {
            responses: [{ stamped_ecr: { extended_bundle: mockEcr } }],
          },
        }),
      });

      await getOrchestrationResponse({
        ecr: new File(["ecr"], "ecr.xml"),
        rr: new File(["rr"], "rr.xml"),
      });
      const args = (global.fetch as jest.Mock).mock.calls[0];
      expect(args[0]).toEndWith("process-message");
      const body = args[1].body;
      expect(body).toEqual(
        '{"message_type":"ecr","include_error_types":"[errors]","config_file_name":"bundle-only.json","data_type":"ecr","message":"ecr","rr_data":"rr"}',
      );
      const headers = args[1].headers;
      expect([...headers.entries()]).toStrictEqual([
        ["content-type", "application/json"],
      ]);
    });

    it("should handle undefined rr", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        json: jest.fn().mockResolvedValue({
          processed_values: {
            responses: [{ stamped_ecr: { extended_bundle: mockEcr } }],
          },
        }),
      });

      await getOrchestrationResponse({
        ecr: new File(["ecr"], "ecr.xml"),
        rr: undefined,
      });
      const args = (global.fetch as jest.Mock).mock.calls[0];
      expect(args[0]).toEndWith("process-message");
      const body = args[1].body;
      expect(body).toEqual(
        '{"message_type":"ecr","include_error_types":"[errors]","config_file_name":"bundle-only.json","data_type":"ecr","message":"ecr"}',
      );
      const headers = args[1].headers;
      expect([...headers.entries()]).toStrictEqual([
        ["content-type", "application/json"],
      ]);
    });
  });

  describe("orchestrationConfig", () => {
    let appendMock: jest.SpyInstance;

    beforeEach(() => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        json: jest.fn().mockResolvedValue({
          processed_values: {
            responses: [
              { stamped_ecr: { extended_bundle: mockEcr } },
              { metadata_values: mockMetadata },
            ],
          },
        }),
      });
      appendMock = jest.spyOn(FormData.prototype, "append");
      process.env.METADATA_DATABASE_TYPE = undefined;
      process.env.METADATA_DATABASE_SCHEMA = undefined;
    });
    it("should use bundle-only.json when no metadata db", async () => {
      delete process.env.METADATA_DATABASE_TYPE;
      delete process.env.METADATA_DATABASE_SCHEMA;

      await orchestrationRequest({ ecr: mockFile }, false);

      expect(appendMock).toHaveBeenCalledWith(
        "config_file_name",
        "bundle-only.json",
      );
    });
    it("should use bundle-metadata-extended.json when metadata db exists and metadata is extended ", async () => {
      process.env.METADATA_DATABASE_TYPE = "postgres";
      process.env.METADATA_DATABASE_SCHEMA = "extended";

      await orchestrationRequest({ ecr: mockFile }, false);

      expect(appendMock).toHaveBeenCalledWith(
        "config_file_name",
        "bundle-metadata-extended.json",
      );
    });
    it("should use bundle-metadata-core.json when metadata db exists and metadata is core ", async () => {
      process.env.METADATA_DATABASE_TYPE = "postgres";
      process.env.METADATA_DATABASE_SCHEMA = "core";

      await orchestrationRequest({ ecr: mockFile }, false);

      expect(appendMock).toHaveBeenCalledWith(
        "config_file_name",
        "bundle-metadata-core.json",
      );
    });
  });
});
