import { BlobServiceClient } from "@azure/storage-blob";

import { AZURE_SOURCE } from "@/app/data/blobStorage/utils";
import { getFhirData } from "@/app/services/fhirDataService";

import { getLastAuditLog } from "./helpers/core";
import { buildCore } from "./helpers/ddl";

const dummyFhirBundle = "dummy_fhir_bundle";
const simpleResponse = {
  fhirBundle: dummyFhirBundle,
};

beforeAll(async () => {
  await buildCore();
});

describe("FHIR data service", () => {
  const blockBlobClient = {
    download: jest.fn(),
  };

  beforeEach(() => {
    process.env.AZURE_STORAGE_CONNECTION_STRING = "connection";
    const containerClient = {
      getBlobClient: jest.fn().mockReturnValue(blockBlobClient),
    };

    const blobClient = {
      getContainerClient: jest.fn().mockReturnValue(containerClient),
    };

    (BlobServiceClient.fromConnectionString as jest.Mock).mockReturnValue(
      blobClient,
    );
  });

  it("should add an audit log when it attempts to retrieves a FHIR bundle", async () => {
    process.env.SOURCE = AZURE_SOURCE;
    blockBlobClient.download = jest
      .fn()
      .mockReturnValue({ readableStreamBody: dummyFhirBundle });
    const fake_id = "123";
    const response = await getFhirData({ ecr_id: fake_id });

    const log = await getLastAuditLog();
    expect(log.subject).toEqual("ecr");
    expect(log.action).toEqual("query");
    expect(JSON.parse(log.parameter_json)).toStrictEqual({
      ecr_id: fake_id,
    });

    expect(response.status).toEqual(200);
    expect(response.payload).toEqual(simpleResponse);
    expect(blockBlobClient.download).toHaveBeenCalledTimes(1);
  });
});
