/**
 * @jest-environment node
 */
import { Bundle } from "fhir/r4";

import { createFakeZip } from "../../../helpers";
import {
  deleteFromStorage,
  saveFhirMetadata,
  saveToStorage,
} from "@/app/api/save-fhir-data/service";
import type {
  BundleExtendedMetadata,
  BundleMetadata,
} from "@/app/api/save-fhir-data/types";
import {
  deleteFromAzure,
  existsInAzure,
  saveToAzure,
} from "@/app/data/blobStorage/azureClient";
import {
  deleteFromGCP,
  existsInGCP,
  saveToGCP,
} from "@/app/data/blobStorage/gcpClient";
import {
  deleteFromS3,
  existsInS3,
  saveToS3,
} from "@/app/data/blobStorage/s3Client";
import { getDb } from "@/app/data/metadataDb/database";
import { createAuditRecord } from "@/app/services/auditLogService";

jest.mock("@/app/data/blobStorage/azureClient");
jest.mock("@/app/data/blobStorage/gcpClient");
jest.mock("@/app/data/blobStorage/s3Client");
jest.mock("@/app/data/metadataDb/database", () => ({
  getDb: jest.fn(),
}));
jest.mock("@/app/services/auditLogService", () => ({
  createAuditRecord: jest.fn(),
}));

type InsertRecord = {
  table: string;
  values: unknown;
};

const makeMetadataDbMock = ({
  existingEcrCount = 0,
  failOnTable,
}: {
  existingEcrCount?: number;
  failOnTable?: string;
} = {}) => {
  const inserts: InsertRecord[] = [];
  const trx = {
    selectFrom: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    executeTakeFirst: jest
      .fn()
      .mockResolvedValue({ num_ecr: existingEcrCount }),
    insertInto: jest.fn((table: string) => ({
      values: jest.fn((values: unknown) => ({
        execute: jest.fn(async () => {
          if (failOnTable === table) {
            throw new Error(`Failed to insert ${table}`);
          }
          inserts.push({ table, values });
        }),
      })),
    })),
  };
  const execute = jest.fn(
    (callback: (trxArg: typeof trx) => Promise<unknown> | unknown) =>
      callback(trx),
  );
  const transaction = jest.fn(() => ({ execute }));

  (getDb as jest.Mock).mockReturnValue({ transaction });

  return { execute, inserts, transaction, trx };
};

const coreMetadata: BundleMetadata = {
  last_name: "Patient",
  first_name: "Some",
  birth_date: "1970-01-01",
  set_id: undefined,
  eicr_version_number: "1",
  encounter_start_date: "2026-07-14",
  facility_name: "Facility",
  rr: [
    {
      condition: "Pertussis",
      condition_code: "27836007",
      rule_summaries: [
        { rule_summary: "Matched suspected condition" },
        { rule_summary: "Matched reportable lab" },
      ],
    },
  ],
};

const makeLabMetadata = (index: number) => ({
  uuid: `lab-${index}`,
  test_type: `Test ${index}`,
  test_type_code: `test-code-${index}`,
  test_type_system: "LOINC",
  test_result_qualitative: "Detected",
  test_result_quantitative: `${index}`,
  test_result_units: "copies/mL",
  test_result_code: `result-code-${index}`,
  test_result_code_display: `Result ${index}`,
  test_result_code_system: "SNOMED",
  test_result_interpretation: "Positive",
  test_result_interpretation_code: "POS",
  test_result_interpretation_system: "HL7",
  test_result_reference_range_low_value: "0",
  test_result_reference_range_low_units: "mL",
  test_result_reference_range_high_value: "10",
  test_result_reference_range_high_units: "mL",
  specimen_type: "Nasopharyngeal swab",
  performing_lab: "Skylight Lab",
  specimen_collection_date: "2026-07-14",
});

const makeExtendedMetadata = (
  overrides: Partial<BundleExtendedMetadata> = {},
): BundleExtendedMetadata => ({
  ...coreMetadata,
  rr: undefined,
  gender: "female",
  race: "race",
  ethnicity: "ethnicity",
  patient_addresses: undefined,
  processing_status: "new",
  eicr_id: "metadata-ecr-id",
  authoring_date: "2026-07-14",
  ehr_software: "EHR",
  ehr_manufacturer_model: "EHR Model",
  provider_id: "provider-1",
  facility_id: "facility-1",
  facility_name: "Facility",
  encounter_type: "ambulatory",
  encounter_end_date: "2026-07-14",
  reason_for_visit: "Cough",
  active_problems: "Problem",
  labs: undefined,
  immunizations: undefined,
  birth_sex: "female",
  gender_identity: "female",
  homelessness_status: undefined,
  tribal_affiliation: undefined,
  tribal_enrollment_status: undefined,
  current_job_title: undefined,
  current_job_industry: undefined,
  usual_occupation: undefined,
  usual_industry: undefined,
  preferred_language: "English",
  pregnancy_status: undefined,
  ...overrides,
});

describe("saveFhirMetadata", () => {
  const ecrId = "ecr-123";
  const successfulFhirSave = Promise.resolve({
    message: "Saved FHIR data.",
    status: 200,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (createAuditRecord as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("saves core metadata and creates audit record", async () => {
    const { inserts, trx } = makeMetadataDbMock();
    const rollbackFhirData = jest.fn();

    const result = await saveFhirMetadata(
      ecrId,
      "core",
      coreMetadata,
      successfulFhirSave,
      rollbackFhirData,
    );

    expect(result).toEqual({
      message: "Success. Saved metadata to database.",
      status: 200,
    });
    expect(trx.selectFrom).toHaveBeenCalledWith("ecr_data");
    expect(trx.where).toHaveBeenCalledWith("ecr_data.eicr_id", "=", ecrId);
    expect(
      inserts.find((insert) => insert.table === "ecr_data")?.values,
    ).toMatchObject({
      eicr_id: ecrId,
      set_id: ecrId,
      last_name: "Patient",
      first_name: "Some",
      birth_date: "1970-01-01",
      encounter_start_date: new Date("2026-07-14"),
      eicr_version_number: "1",
      facility_name: "Facility",
    });
    expect(
      inserts.find((insert) => insert.table === "ecr_rr_conditions")?.values,
    ).toMatchObject({
      eicr_id: ecrId,
      condition: "Pertussis",
      condition_code: "27836007",
    });
    expect(
      inserts
        .filter((insert) => insert.table === "ecr_rr_rule_summaries")
        .map(
          (insert) => (insert.values as { rule_summary: string }).rule_summary,
        ),
    ).toEqual(["Matched suspected condition", "Matched reportable lab"]);
    expect(createAuditRecord).toHaveBeenCalledWith(trx, "ecr", "create", {
      eicr_id: ecrId,
    });
    expect(rollbackFhirData).not.toHaveBeenCalled();
  });

  it("returns 409 without inserting metadata when the eCR already exists", async () => {
    const { inserts, trx } = makeMetadataDbMock({ existingEcrCount: 1 });
    const rollbackFhirData = jest.fn();

    const result = await saveFhirMetadata(
      ecrId,
      "core",
      coreMetadata,
      successfulFhirSave,
      rollbackFhirData,
    );

    expect(result).toEqual({
      message: `eCR already loaded: ${ecrId}`,
      status: 409,
    });
    expect(trx.executeTakeFirst).toHaveBeenCalledOnce();
    expect(inserts).toEqual([]);
    expect(createAuditRecord).not.toHaveBeenCalled();
    expect(rollbackFhirData).not.toHaveBeenCalled();
  });

  it("returns 400 when the metadata type is unknown", async () => {
    const { inserts } = makeMetadataDbMock();
    const rollbackFhirData = jest.fn();

    const result = await saveFhirMetadata(
      ecrId,
      undefined,
      coreMetadata,
      successfulFhirSave,
      rollbackFhirData,
    );

    expect(result).toEqual({
      message: "Unknown metadataType: undefined",
      status: 400,
    });
    expect(inserts).toEqual([]);
    expect(createAuditRecord).not.toHaveBeenCalled();
    expect(rollbackFhirData).not.toHaveBeenCalled();
  });

  it("rolls back saved FHIR data when metadata insertion fails", async () => {
    makeMetadataDbMock({ failOnTable: "ecr_data" });
    const rollbackFhirData = jest.fn().mockResolvedValue({
      message: "Rolled back FHIR data.",
      status: 200,
    });
    jest.spyOn(console, "error").mockImplementation(() => {});

    const result = await saveFhirMetadata(
      ecrId,
      "core",
      coreMetadata,
      successfulFhirSave,
      rollbackFhirData,
    );

    expect(result).toEqual({
      message: "Failed to insert metadata to database.",
      status: 500,
    });
    expect(rollbackFhirData).toHaveBeenCalledOnce();
  });

  it("saves lab metadata in batches", async () => {
    const { inserts } = makeMetadataDbMock();
    const firstLab = makeLabMetadata(0);
    const labColumnCount = Object.keys({
      ...firstLab,
      eicr_id: ecrId,
      specimen_collection_date: new Date(firstLab.specimen_collection_date),
    }).length;
    const maxLabBatchSize = Math.floor(2099 / labColumnCount);
    const labs = Array.from({ length: maxLabBatchSize + 1 }, (_, index) =>
      makeLabMetadata(index),
    );
    const rollbackFhirData = jest.fn();

    const result = await saveFhirMetadata(
      ecrId,
      "extended",
      makeExtendedMetadata({ labs }),
      successfulFhirSave,
      rollbackFhirData,
    );

    const labInserts = inserts.filter((insert) => insert.table === "ecr_labs");

    expect(result).toEqual({
      message: "Success. Saved metadata to database.",
      status: 200,
    });
    expect(labInserts).toHaveLength(2);
    expect(
      labInserts.map((insert) => (insert.values as unknown[]).length),
    ).toEqual([maxLabBatchSize, 1]);
    expect(
      (labInserts[0].values as Array<Record<string, unknown>>)[0],
    ).toMatchObject({
      eicr_id: ecrId,
      specimen_collection_date: new Date("2026-07-14"),
    });
    expect(rollbackFhirData).not.toHaveBeenCalled();
  });
});

describe("Cloud save and delete", () => {
  describe("saveFhirData", () => {
    const fhirBundle: Bundle = { resourceType: "Bundle", type: "batch" };
    const ecrId = "1234";
    const xmlString = "<ClinicalDocument>Fake ECR XML</ClinicalDocument>";

    const mockZip = createFakeZip(xmlString);

    beforeEach(() => {
      jest.clearAllMocks();
    });

    afterEach(() => {
      process.env.ECR_BUCKET_NAME = "";
    });

    it("should call s3 when given a fhir bundle", async () => {
      process.env.ECR_BUCKET_NAME = "bucket";
      (existsInS3 as jest.Mock).mockResolvedValue(false);

      await saveToStorage(fhirBundle, ecrId, "s3", "fhir");
      expect(saveToS3).toHaveBeenCalledOnce();
    });

    it("should call azure when given a fhir bundle", async () => {
      process.env.ECR_BUCKET_NAME = "bucket";
      (existsInAzure as jest.Mock).mockResolvedValue(false);

      await saveToStorage(fhirBundle, ecrId, "azure", "fhir");
      expect(saveToAzure).toHaveBeenCalledOnce();
    });

    it("should call gcp when given a fhir bundle", async () => {
      process.env.ECR_BUCKET_NAME = "bucket";
      (existsInGCP as jest.Mock).mockResolvedValue(false);

      await saveToStorage(fhirBundle, ecrId, "gcp", "fhir");
      expect(saveToGCP).toHaveBeenCalledOnce();
    });

    it("should call s3 when given a zip", async () => {
      process.env.ECR_BUCKET_NAME = "bucket";
      (existsInS3 as jest.Mock).mockResolvedValue(false);

      await saveToStorage(mockZip, ecrId, "s3", "xml");
      expect(saveToS3).toHaveBeenCalledOnce();
    });

    it("should call azure when given a zip", async () => {
      process.env.ECR_BUCKET_NAME = "bucket";
      (existsInAzure as jest.Mock).mockResolvedValue(false);

      await saveToStorage(mockZip, ecrId, "azure", "xml");
      expect(saveToAzure).toHaveBeenCalledOnce();
    });

    it("should call gcp when given a zip", async () => {
      process.env.ECR_BUCKET_NAME = "bucket";
      (existsInGCP as jest.Mock).mockResolvedValue(false);

      await saveToStorage(mockZip, ecrId, "gcp", "xml");
      expect(saveToGCP).toHaveBeenCalledOnce();
    });

    it("should return 409 and not save when the blob already exists in s3", async () => {
      (existsInS3 as jest.Mock).mockResolvedValue(true);

      const result = await saveToStorage(fhirBundle, ecrId, "s3", "fhir");

      expect(result).toEqual({
        message: `eCR already loaded: ${ecrId}`,
        status: 409,
      });
      expect(saveToS3).not.toHaveBeenCalled();
    });

    it("should return 409 and not save when the blob already exists in azure", async () => {
      (existsInAzure as jest.Mock).mockResolvedValue(true);

      const result = await saveToStorage(fhirBundle, ecrId, "azure", "fhir");

      expect(result).toEqual({
        message: `eCR already loaded: ${ecrId}`,
        status: 409,
      });
      expect(saveToAzure).not.toHaveBeenCalled();
    });

    it("should return 409 and not save when the blob already exists in gcp", async () => {
      (existsInGCP as jest.Mock).mockResolvedValue(true);

      const result = await saveToStorage(fhirBundle, ecrId, "gcp", "fhir");

      expect(result).toEqual({
        message: `eCR already loaded: ${ecrId}`,
        status: 409,
      });
      expect(saveToGCP).not.toHaveBeenCalled();
    });

    it("should return an error for an invalid save source", async () => {
      const result = await saveToStorage(
        fhirBundle,
        ecrId,
        "invalid-source",
        "fhir",
      );

      expect(result).toEqual({
        message:
          'Invalid save source. Please provide a valid value for \'saveSource\' ("s3", "azure", or "gcp").',
        status: 400,
      });
    });

    it("should return 400 for an invalid fileType", async () => {
      const result = await saveToStorage(fhirBundle, ecrId, "s3", "invalid");

      expect(result).toEqual({
        message:
          'Invalid fileType or contents for fileType "invalid". Could not determine object key.',
        status: 400,
      });
      expect(existsInS3).not.toHaveBeenCalled();
    });
  });

  describe("deleteFromStorage", () => {
    const ecrId = "1234";

    beforeEach(() => {
      jest.clearAllMocks();
    });

    afterEach(() => {
      process.env.ECR_BUCKET_NAME = "";
    });

    it("should call S3 delete when deleting a FHIR bundle", async () => {
      await deleteFromStorage(ecrId, "s3", "fhir");
      expect(deleteFromS3).toHaveBeenCalledWith(`${ecrId}.json`);
      expect(deleteFromS3).toHaveBeenCalledTimes(1);
    });

    it("should call Azure delete when deleting a FHIR bundle", async () => {
      await deleteFromStorage(ecrId, "azure", "fhir");
      expect(deleteFromAzure).toHaveBeenCalledWith(`${ecrId}.json`);
      expect(deleteFromAzure).toHaveBeenCalledTimes(1);
    });

    it("should call GCP delete when deleting a FHIR bundle", async () => {
      await deleteFromStorage(ecrId, "gcp", "fhir");
      expect(deleteFromGCP).toHaveBeenCalledWith(`${ecrId}.json`);
      expect(deleteFromGCP).toHaveBeenCalledTimes(1);
    });

    it("should call S3 delete when deleting XML zip", async () => {
      await deleteFromStorage(ecrId, "s3", "xml");
      expect(deleteFromS3).toHaveBeenCalledWith(`${ecrId}.zip`);
      expect(deleteFromS3).toHaveBeenCalledTimes(1);
    });

    it("should call Azure delete when deleting XML zip", async () => {
      await deleteFromStorage(ecrId, "azure", "xml");
      expect(deleteFromAzure).toHaveBeenCalledWith(`${ecrId}.zip`);
      expect(deleteFromAzure).toHaveBeenCalledTimes(1);
    });

    it("should call GCP delete when deleting XML zip", async () => {
      await deleteFromStorage(ecrId, "gcp", "xml");
      expect(deleteFromGCP).toHaveBeenCalledWith(`${ecrId}.zip`);
      expect(deleteFromGCP).toHaveBeenCalledTimes(1);
    });

    it("should return an error for an invalid save source", async () => {
      const result = await deleteFromStorage(ecrId, "invalid-source", "xml");

      expect(result).toEqual({
        message:
          'Invalid save source. Please provide a valid value for \'saveSource\' ("s3", "azure", or "gcp").',
        status: 400,
      });
    });
  });
});
