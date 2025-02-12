/**
 * @jest-environment node
 */
import { processZip } from "@/app/api/process-zip/service";
import {
  saveFhirData,
  saveWithMetadata,
} from "@/app/api/save-fhir-data/save-fhir-data-service";
import { S3_SOURCE } from "@/app/api/utils";

jest.mock("../../../api/save-fhir-data/save-fhir-data-service");

describe("processZip", () => {
  const mockFile = new File(["content"], "test.zip");
  const mockEcr = { entry: [{ resource: { id: "123" } }] };
  const mockMetadata = { key: "value" };

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.SOURCE = S3_SOURCE;
  });

  it("should save file with metadata when orchestration response contains metadata", async () => {
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
    (saveWithMetadata as jest.Mock).mockResolvedValue({
      status: 200,
      message: "Success",
    });

    const response = await processZip(mockFile);

    expect(response).toEqual({ status: 200, message: "Success" });
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

    const response = await processZip(mockFile);

    expect(response).toEqual({ status: 200, message: "Success" });
    expect(saveFhirData).toHaveBeenCalledWith(mockEcr, "123", S3_SOURCE);
  });

  it("should return 500 status when orchestration response fails", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 500,
      json: jest.fn().mockResolvedValue({ message: "Error" }),
    });
    jest.spyOn(console, "error").mockImplementation(() => {});

    const response = await processZip(mockFile);

    expect(response).toEqual({
      message: "Failed to process orchestration response",
      status: 500,
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
      process.env.NON_INTEGRATED_VIEWER = "false";
      process.env.METADATA_DATABASE_SCHEMA = undefined;
    });
    it("should use bundle-only.json when non_integrated_viewer is false ", async () => {
      process.env.NON_INTEGRATED_VIEWER = "false";
      process.env.METADATA_DATABASE_SCHEMA = undefined;

      await processZip(mockFile);

      expect(appendMock).toHaveBeenCalledWith(
        "config_file_name",
        "bundle-only.json",
      );
    });
    it("should use bundle-metadata-extended.json when non_integrated_viewer is true and metadata is extended ", async () => {
      process.env.NON_INTEGRATED_VIEWER = "true";
      process.env.METADATA_DATABASE_SCHEMA = "extended";

      await processZip(mockFile);

      expect(appendMock).toHaveBeenCalledWith(
        "config_file_name",
        "bundle-metadata-extended.json",
      );
    });
    it("should use bundle-metadata-core.json when non_integrated_viewer is true and metadata is core ", async () => {
      process.env.NON_INTEGRATED_VIEWER = "true";
      process.env.METADATA_DATABASE_SCHEMA = "core";

      await processZip(mockFile);

      expect(appendMock).toHaveBeenCalledWith(
        "config_file_name",
        "bundle-metadata-core.json",
      );
    });
  });
});
