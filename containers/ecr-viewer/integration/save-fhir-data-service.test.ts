/**
 * @jest-environment node
 */

import {
  saveCoreMetadata,
  saveExtendedMetadata,
} from "@/app/api/save-fhir-data/save-fhir-data-service";
import {
  BundleMetadata,
  BundleExtendedMetadata,
} from "@/app/api/save-fhir-data/types";

import {
  buildCore,
  buildExtended,
  clearCore,
  clearExtended,
  dropCore,
  dropExtended,
} from "./helpers/ddl";

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
  ecr_id: "234322",
  last_name: "Kenobi",
  first_name: "Obi-Wan",
  birth_date: "1970-01-01",
  rr: [],
  report_date: "2024-12-20",
};

describe("saveExtendedMetadata", () => {
  beforeAll(async () => {
    await buildExtended();
  });

  afterAll(async () => {
    await dropExtended();
  });

  afterEach(async () => {
    await clearExtended();
  });

  it("should save without any rr", async () => {
    const resp = await saveExtendedMetadata(baseExtendedMetadata, "1-2-3-4");
    expect(resp.message).toEqual("Success. Saved metadata to database.");
    expect(resp.status).toEqual(200);
  });

  it("should save with rr without rule summaries", async () => {
    const metadata: BundleExtendedMetadata = {
      ...baseExtendedMetadata,
      rr: [
        {
          condition: "flu",
          rule_summaries: [],
        },
      ],
    };

    const resp = await saveExtendedMetadata(metadata, "1-2-3-4");

    expect(resp.message).toEqual("Success. Saved metadata to database.");
    expect(resp.status).toEqual(200);
  });

  it("should save with rr with rule summaries", async () => {
    const metadata: BundleExtendedMetadata = {
      ...baseExtendedMetadata,
      rr: [
        {
          condition: "flu",
          rule_summaries: [{ summary: "fever" }, { summary: "influenza" }],
        },
      ],
    };

    const resp = await saveExtendedMetadata(metadata, "1-2-3-4");

    expect(resp.message).toEqual("Success. Saved metadata to database.");
    expect(resp.status).toEqual(200);
  });

  it("should return an error when db save fails", async () => {
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
    const resp = await saveExtendedMetadata(badMetadata, "1-2-3-4");

    expect(resp.message).toEqual("Failed to insert metadata to database.");
    expect(resp.status).toEqual(500);
  });
});

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

describe("saveCoreMetadata", () => {
  beforeAll(async () => {
    await buildCore();
  });

  afterAll(async () => {
    await dropCore();
  });

  afterEach(async () => {
    await clearCore();
  });

  it("should save without any rr", async () => {
    const resp = await saveCoreMetadata(baseCoreMetadata, "1-2-3-4");

    expect(resp.message).toEqual("Success. Saved metadata to database.");
    expect(resp.status).toEqual(200);
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

    const resp = await saveCoreMetadata(metadata, "1-2-3-4");

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

    const resp = await saveCoreMetadata(metadata, "1-2-3-4");

    expect(resp.message).toEqual("Success. Saved metadata to database.");
    expect(resp.status).toEqual(200);
  });

  it("should return an error when db save fails", async () => {
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
    const resp = await saveCoreMetadata(badMetadata, "1-2-3-4");

    expect(resp.message).toEqual("Failed to insert metadata to database.");
    expect(resp.status).toEqual(500);
  });
});
