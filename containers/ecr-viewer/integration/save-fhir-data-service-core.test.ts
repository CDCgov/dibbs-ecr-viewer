/**
 * @jest-environment node
 */

import { saveFhirMetadata } from "@/app/api/save-fhir-data/save-fhir-data-service";
import { BundleMetadata } from "@/app/api/save-fhir-data/types";
import { getDb } from "@/app/api/services/database";
import { Core } from "@/app/api/services/types/core";
import { BlobResponse } from "@/app/data/blobStorage/utils";

import { buildCore, clearCore, dropExisting } from "./helpers/ddl";

const baseCoreMetadata: BundleMetadata = {
  last_name: "lname",
  first_name: "fname",
  birth_date: "2000-01-01",
  data_source: "s3",
  eicr_set_id: "1234",
  eicr_version_number: "1",
  rr: [],
  report_date: "12/20/2024",
};

const makePromiseResolveWithStatus = (status: number): Promise<BlobResponse> =>
  new Promise((resolve) => resolve({ message: "hi there", status }));

beforeAll(async () => {
  await buildCore();
});

afterAll(async () => {
  await dropExisting();
});

describe("core", () => {
  afterEach(async () => {
    await clearCore();
  });

  it("should save without any rr", async () => {
    let rolledback = false;
    const resp = await saveFhirMetadata(
      "1-2-3-4",
      "core",
      baseCoreMetadata,
      makePromiseResolveWithStatus(200),
      () => {
        rolledback = true;
        return makePromiseResolveWithStatus(200);
      },
    );

    expect(resp.message).toEqual("Success. Saved metadata to database.");
    expect(resp.status).toEqual(200);
    expect(rolledback).toBeFalse();
  });

  it("should save with rr without rule summaries", async () => {
    const metadata: BundleMetadata = {
      ...baseCoreMetadata,
      rr: [
        {
          condition: "flu",
          rule_summaries: [],
        },
      ],
    };

    const resp = await saveFhirMetadata(
      "1-2-3-4",
      "core",
      metadata,
      makePromiseResolveWithStatus(200),
      () => makePromiseResolveWithStatus(200),
    );

    expect(resp.message).toEqual("Success. Saved metadata to database.");
    expect(resp.status).toEqual(200);
  });

  it("should save with rr with rule summaries", async () => {
    const metadata: BundleMetadata = {
      ...baseCoreMetadata,
      rr: [
        {
          condition: "flu",
          rule_summaries: [{ summary: "fever" }, { summary: "influenza" }],
        },
      ],
    };

    const resp = await saveFhirMetadata(
      "1-2-3-4",
      "core",
      metadata,
      makePromiseResolveWithStatus(200),
      () => makePromiseResolveWithStatus(200),
    );

    expect(resp.message).toEqual("Success. Saved metadata to database.");
    expect(resp.status).toEqual(200);
  });

  it("should return an error and roll back fhir bundle when db save fails", async () => {
    let rolledback = false;
    jest.spyOn(console, "error").mockImplementation();
    const badMetadata = {
      last_name: null,
      first_name: null,
      birth_date: "01/01/2000",
      data_source: "s3",
      eicr_set_id: "1234",
      eicr_version_number: "1",
      rr: [],
      report_date: new Date("a"),
    } as unknown as BundleMetadata;
    const resp = await saveFhirMetadata(
      "1-2-3-4-3-2",
      "core",
      badMetadata,
      makePromiseResolveWithStatus(200),
      () => {
        rolledback = true;
        return makePromiseResolveWithStatus(200);
      },
    );

    const res = await getDb<Core>()
      .selectFrom("ecr_data")
      .selectAll()
      .where("ecr_data.eicr_id", "=", "1-2-3-4-3-2")
      .execute();

    expect(resp.message).toEqual("Failed to insert metadata to database.");
    expect(resp.status).toEqual(500);
    expect(rolledback).toBeTrue();
    expect(res).toHaveLength(0);
  });

  it("should return an error and roll back db when fhir bundle save fails", async () => {
    let rolledback = false;
    jest.spyOn(console, "error").mockImplementation();
    const resp = await saveFhirMetadata(
      "1-2-3-4-5-6",
      "core",
      baseCoreMetadata,
      makePromiseResolveWithStatus(500),
      () => {
        rolledback = true;
        return makePromiseResolveWithStatus(200);
      },
    );

    const res = await getDb<Core>()
      .selectFrom("ecr_data")
      .selectAll()
      .where("ecr_data.eicr_id", "=", "1-2-3-4-5-6")
      .execute();

    expect(resp.message).toEqual("Failed to insert metadata to database.");
    expect(resp.status).toEqual(500);
    expect(rolledback).toBeFalse();
    expect(res).toHaveLength(0);
  });

  it("should 409 if same eCR inserted twice", async () => {
    let rolledback = false;
    const resp1 = await saveFhirMetadata(
      "1-2-3-4",
      "core",
      baseCoreMetadata,
      makePromiseResolveWithStatus(200),
      () => {
        rolledback = true;
        return makePromiseResolveWithStatus(200);
      },
    );

    expect(resp1.status).toEqual(200);
    expect(rolledback).toBeFalse();

    const resp2 = await saveFhirMetadata(
      "1-2-3-4",
      "core",
      baseCoreMetadata,
      makePromiseResolveWithStatus(200),
      () => {
        rolledback = true;
        return makePromiseResolveWithStatus(200);
      },
    );

    expect(resp2.status).toEqual(409);
    expect(rolledback).toBeFalse();
  });

  it("should 400 with unknown schema", async () => {
    let rolledback = false;
    const resp = await saveFhirMetadata(
      "1-2-3-4",
      "unknown" as "core", // appease typescript
      baseCoreMetadata,
      makePromiseResolveWithStatus(200),
      () => {
        rolledback = true;
        return makePromiseResolveWithStatus(200);
      },
    );

    expect(resp.message).toEqual("Unknown metadataType: unknown");
    expect(resp.status).toEqual(400);
    expect(rolledback).toBeFalse();
  });
});
