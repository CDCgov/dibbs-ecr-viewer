/**
 * @jest-environment node
 */

import { buildExtended, clearExtended, dropExisting } from "../helpers/ddl";
import { saveFhirMetadata } from "@/app/api/save-fhir-data/service";
import { BundleExtendedMetadata } from "@/app/api/save-fhir-data/types";
import { BlobResponse } from "@/app/data/blobStorage/utils";
import { getDb } from "@/app/data/metadataDb/database";
import { Extended } from "@/app/data/metadataDb/types/extended";

const baseExtendedMetadata: BundleExtendedMetadata = {
  patient_id: "12345",
  person_id: "67890",
  gender: "Male",
  race: "White",
  ethnicity: "Non-Hispanic",
  patient_addresses: [
    {
      use: "home",
      type: "postal",
      text: "123 Main St, Anytown, USA",
      line: "123 Main St",
      city: "Anytown",
      district: "District 1",
      state: "CA",
      postal_code: "12345",
      country: "USA",
      period_start: "2020-01-01",
      period_end: "2024-01-01",
    },
  ],
  latitude: "53040",
  longitude: "-120.1234",
  rr_id: "rr-12345",
  processing_status: "Processed",
  eicr_set_id: "1234",
  eicr_id: "eicr-12345",
  eicr_version_number: "1.0",
  replaced_eicr_id: "23423",
  replaced_eicr_version: "23432",
  authoring_datetime: "2024-01-01",
  provider_id: "12345",
  facility_id_number: "12345",
  facility_name: "Hospital A",
  facility_type: "Inpatient",
  encounter_type: "Inpatient",
  encounter_start_date: "2024-01-01",
  encounter_end_date: "2024-01-02",
  reason_for_visit: "Routine checkup",
  active_problems: "Diabetes, Hypertension",
  labs: [
    {
      uuid: "lab-12345",
      test_type: "Blood Glucose",
      test_type_code: "12345",
      test_type_system: "http://loinc.org",
      test_result_qualitative: "mg/dL",
      test_result_quantitative: "120",
      test_result_units: "mg/dL",
      test_result_code: "12345",
      test_result_code_display: "Blood Glucose",
      test_result_code_system: "http://loinc.org",
      test_result_interpretation: "Normal",
      test_result_interpretation_code: "N",
      test_result_interpretation_system:
        "http://hl7.org/fhir/v3/ObservationInterpretation",
      test_result_ref_range_low: "70",
      test_result_ref_range_low_units: "mg/dL",
      test_result_ref_range_high: "140",
      test_result_ref_range_high_units: "mg/dL",
      specimen_type: "Blood",
      performing_lab: "Lab A",
      specimen_collection_date: "2024-01-01",
    },
  ],
  birth_sex: "Chill Guy",
  gender_identity: "Chiller Guy",
  homelessness_status: "Not Homeless",
  disabilities: "None",
  tribal_affiliation: "None",
  tribal_enrollment_status: "Not Enrolled",
  current_job_title: "Jedi",
  current_job_industry: "Space Exploration",
  usual_occupation: "Jedi Knight",
  usual_industry: "Space Exploration",
  preferred_language: "English",
  pregnancy_status: "Pregnant",
  last_name: "Kenobi",
  first_name: "Obi-Wan",
  birth_date: "1970-01-01",
  rr: [],
  report_date: "2024-12-20",
};

const condition_reference = {
  code: "123",
  concept_name: "condition (disease)",
  condition_name: "condition",
  condition_category: "category",
};

const adminId = "1235";
const adminUser = {
  uuid: adminId,
  email: "admin@test.gov",
  name: "Adam Admin",
  date_of_last_login: new Date("2024-01-01"),
  user_type: "admin",
  status: "active",
  author_uuid: adminId,
};

const progId = "234-12";
const programArea = {
  uuid: progId,
  name: "Disease",
  author_uuid: adminId,
};

const makePromiseResolveWithStatus = (status: number): Promise<BlobResponse> =>
  new Promise((resolve) => resolve({ message: "hi there", status }));

beforeAll(async () => {
  await buildExtended();
});

afterAll(async () => {
  await dropExisting();
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("saveFhirData - extended", () => {
  beforeEach(async () => {
    const db = getDb<Extended>();
    await db.insertInto("user").values(adminUser).execute();
    await db.insertInto("program_area").values(programArea).execute();
    await db
      .insertInto("condition_reference")
      .values(condition_reference)
      .execute();
  });

  afterEach(async () => {
    await clearExtended();
  });

  it("should save without any rr", async () => {
    const resp = await saveFhirMetadata(
      "1-2-3-4",
      "extended",
      baseExtendedMetadata,
      makePromiseResolveWithStatus(200),
      () => makePromiseResolveWithStatus(200),
    );
    expect(resp.message).toEqual("Success. Saved metadata to database.");
    expect(resp.status).toEqual(200);
  });

  it("should save with rr without rule summaries", async () => {
    const metadata: BundleExtendedMetadata = {
      ...baseExtendedMetadata,
      rr: [
        {
          condition: "flu",
          condition_code: "123",
          rule_summaries: [],
        },
      ],
    };

    const resp = await saveFhirMetadata(
      "1-2-3-4",
      "extended",
      metadata,
      makePromiseResolveWithStatus(200),
      () => makePromiseResolveWithStatus(200),
    );

    expect(resp.message).toEqual("Success. Saved metadata to database.");
    expect(resp.status).toEqual(200);
  });

  it("should save with rr with rule summaries", async () => {
    const metadata: BundleExtendedMetadata = {
      ...baseExtendedMetadata,
      rr: [
        {
          condition: "flu",
          condition_code: "123",
          rule_summaries: [{ summary: "fever" }, { summary: "influenza" }],
        },
      ],
    };

    const resp = await saveFhirMetadata(
      "1-2-3-4",
      "extended",
      metadata,
      makePromiseResolveWithStatus(200),
      () => makePromiseResolveWithStatus(200),
    );

    expect(resp.message).toEqual("Success. Saved metadata to database.");
    expect(resp.status).toEqual(200);
  });

  it("should return an error and roll back fhir data when db save fails", async () => {
    let rolledback = false;
    const badMetadata = {
      last_name: null,
      first_name: null,
      birth_date: "01/01/2000",
      data_source: "s3",
      eicr_set_id: "1234",
      eicr_version_number: "1",
      rr: [],
      report_date: new Date("12/20/2024"),
    } as unknown as BundleExtendedMetadata;
    jest.spyOn(console, "error").mockImplementation();
    const resp = await saveFhirMetadata(
      "1-2-3-4",
      "extended",
      badMetadata,
      makePromiseResolveWithStatus(200),
      () => {
        rolledback = true;
        return makePromiseResolveWithStatus(200);
      },
    );

    const res = await getDb<Extended>()
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
      "extended",
      baseExtendedMetadata,
      makePromiseResolveWithStatus(500),
      () => {
        rolledback = true;
        return makePromiseResolveWithStatus(200);
      },
    );

    const res = await getDb<Extended>()
      .selectFrom("ecr_data")
      .selectAll()
      .where("ecr_data.eicr_id", "=", "1-2-3-4-5-6")
      .execute();

    expect(resp.message).toEqual("Failed to insert metadata to database.");
    expect(resp.status).toEqual(500);
    expect(rolledback).toBeFalse();
    expect(res).toHaveLength(0);
  });
  it("should reference the condition_code foreign key", async () => {
    const db = getDb<Extended>();
    const metadata: BundleExtendedMetadata = {
      ...baseExtendedMetadata,
      rr: [
        {
          condition: "flu",
          condition_code: "123",
          rule_summaries: [{ summary: "fever" }, { summary: "influenza" }],
        },
      ],
    };

    const resp = await saveFhirMetadata(
      "1-2-3-4",
      "core",
      metadata,
      makePromiseResolveWithStatus(200),
      () => {
        return makePromiseResolveWithStatus(200);
      },
    );

    const conditions = await db
      .selectFrom("ecr_rr_conditions")
      .selectAll()
      .execute();

    expect(resp.message).toEqual("Success. Saved metadata to database.");
    expect(resp.status).toEqual(200);
    expect(conditions).toHaveLength(1);
    expect(conditions[0].condition_code).toEqual("123");
  });
});
