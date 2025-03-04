/**
 * @jest-environment node
 */

import { sql } from "kysely";
import { Kysely } from "kysely";

import {
  saveCoreMetadata,
  saveExtendedMetadata,
} from "@/app/api/save-fhir-data/save-fhir-data-service";
import {
  BundleMetadata,
  BundleExtendedMetadata,
} from "@/app/api/save-fhir-data/types";
import { db } from "@/app/api/services/database";
import { Extended } from "@/app/api/services/extended_types";
import { Core } from "@/app/api/services/types";

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
      line: ["123 Main St"],
      city: "Anytown",
      district: "District 1",
      state: "CA",
      postal_code: "12345",
      country: "USA",
      period_start: new Date("2020-01-01"),
      period_end: new Date("2024-01-01"),
    },
  ],
  latitude: 53040,
  longitude: -120.1234,
  rr_id: "rr-12345",
  processing_status: "Processed",
  eicr_set_id: "1234",
  eicr_id: "eicr-12345",
  eicr_version_number: "1.0",
  replaced_eicr_id: "23423",
  replaced_eicr_version: "23432",
  authoring_datetime: new Date("2024-01-01"),
  provider_id: "12345",
  facility_id_number: "12345",
  facility_name: "Hospital A",
  facility_type: "Inpatient",
  encounter_type: "Inpatient",
  encounter_start_date: new Date("2024-01-01"),
  encounter_end_date: new Date("2024-01-02"),
  reason_for_visit: "Routine checkup",
  active_problems: ["Diabetes", "Hypertension"],
  labs: [
    {
      uuid: "lab-12345",
      test_type: "Blood Glucose",
      test_type_code: "12345",
      test_type_system: "http://loinc.org",
      test_result_qualitative: "mg/dL",
      test_result_quantitative: 120,
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
      specimen_collection_date: new Date("2024-01-01"),
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
  birth_date: new Date("1970-01-01"),
  rr: [],
  report_date: new Date("2024-12-20"),
};

describe("saveExtendedMetadata", () => {
  beforeAll(async () => {
    process.env.METADATA_DATABASE_SCHEMA = "extended";
    await db.schema
      .createTable("ecr_data")
      .addColumn("eICR_ID", "varchar(200)", (cb) => cb.primaryKey())
      .addColumn("set_id", "varchar(255)")
      .addColumn("fhir_reference_link", "varchar(255)")
      .addColumn("last_name", "varchar(255)", (cb) => cb.notNull())
      .addColumn("first_name", "varchar(255)", (cb) => cb.notNull())
      .addColumn("birth_date", "date", (cb) => cb.notNull())
      .addColumn("gender", "varchar(100)")
      .addColumn("birth_sex", "varchar(255)")
      .addColumn("gender_identity", "varchar(255)")
      .addColumn("race", "varchar(255)")
      .addColumn("ethnicity", "varchar(255)")
      .addColumn("latitude", "numeric")
      .addColumn("longitude", "numeric")
      .addColumn("homelessness_status", "varchar(255)")
      .addColumn("disabilities", "varchar(255)")
      .addColumn("tribal_affiliation", "varchar(255)")
      .addColumn("tribal_enrollment_status", "varchar(255)")
      .addColumn("current_job_title", "varchar(255)")
      .addColumn("current_job_industry", "varchar(255)")
      .addColumn("usual_occupation", "varchar(255)")
      .addColumn("usual_industry", "varchar(255)")
      .addColumn("preferred_language", "varchar(255)")
      .addColumn("pregnancy_status", "varchar(255)")
      .addColumn("rr_id", "varchar(255)")
      .addColumn("processing_status", "varchar(255)")
      .addColumn("eicr_version_number", "varchar(50)")
      .addColumn("authoring_date", "date")
      .addColumn("authoring_provider", "varchar(255)")
      .addColumn("provider_id", "varchar(255)")
      .addColumn("facility_id", "varchar(255)")
      .addColumn("facility_name", "varchar(255)")
      .addColumn("encounter_type", "varchar(255)")
      .addColumn("encounter_start_date", "date")
      .addColumn("encounter_end_date", "date")
      .addColumn("reason_for_visit", "text")
      .addColumn("active_problems", "text")
      .addColumn("date_created", "timestamptz", (cb) =>
        cb.notNull().defaultTo(sql`NOW()`),
      )
      .execute();
    await db.schema
      .createTable("patient_address")
      .addColumn("uuid", "varchar(200)", (cb) => cb.primaryKey())
      .addColumn("use", "varchar(50)")
      .addColumn("type", "varchar(50)")
      .addColumn("text", "varchar(255)")
      .addColumn("line", "varchar(255)")
      .addColumn("city", "varchar(100)")
      .addColumn("district", "varchar(100)")
      .addColumn("state", "varchar(100)")
      .addColumn("postal_code", "varchar(20)")
      .addColumn("country", "varchar(100)")
      .addColumn("period_start", "date")
      .addColumn("period_end", "date")
      .addColumn("eICR_ID", "varchar(200)")
      .execute();
    await db.schema
      .createTable("ecr_labs")
      .addColumn("uuid", "varchar(200)", (cb) => cb.primaryKey())
      .addColumn("eICR_ID", "varchar(200)")
      .addColumn("test_type", "varchar(255)")
      .addColumn("test_type_code", "varchar(255)")
      .addColumn("test_type_system", "varchar(255)")
      .addColumn("test_result_qualitative", "varchar(255)")
      .addColumn("test_result_quantitative", "numeric")
      .addColumn("test_result_units", "varchar(50)")
      .addColumn("test_result_code", "varchar(255)")
      .addColumn("test_result_code_display", "varchar(255)")
      .addColumn("test_result_code_system", "varchar(255)")
      .addColumn("test_result_interpretation", "varchar(255)")
      .addColumn("test_result_interpretation_code", "varchar(255)")
      .addColumn("test_result_interpretation_system", "varchar(255)")
      .addColumn("test_result_reference_range_low_value", "numeric")
      .addColumn("test_result_reference_range_low_units", "varchar(50)")
      .addColumn("test_result_reference_range_high_value", "numeric")
      .addColumn("test_result_reference_range_high_units", "varchar(50)")
      .addColumn("specimen_type", "varchar(255)")
      .addColumn("specimen_collection_date", "date")
      .addColumn("performing_lab", "varchar(255)")
      .execute();
    await db.schema
      .createTable("ecr_rr_conditions")
      .addColumn("uuid", "varchar(200)", (cb) => cb.primaryKey())
      .addColumn("eICR_ID", "varchar(255)", (cb) => cb.notNull())
      .addColumn("condition", "varchar")
      .execute();
    await db.schema
      .createTable("ecr_rr_rule_summaries")
      .addColumn("uuid", "varchar(200)", (cb) => cb.primaryKey())
      .addColumn("ecr_rr_conditions_id", "varchar(200)")
      .addColumn("rule_summary", "varchar")
      .execute();
  });

  afterAll(async () => {
    await db.schema.dropTable("ecr_data").execute();
    await db.schema.dropTable("patient_address").execute();
    await db.schema.dropTable("ecr_labs").execute();
    await db.schema.dropTable("ecr_rr_conditions").execute();
    await db.schema.dropTable("ecr_rr_rule_summaries").execute();
  });

  afterEach(async () => {
    await (db as Kysely<Extended>).deleteFrom("ecr_data").execute();
    await (db as Kysely<Extended>).deleteFrom("patient_address").execute();
    await (db as Kysely<Extended>).deleteFrom("ecr_labs").execute();
    await (db as Kysely<Extended>).deleteFrom("ecr_rr_conditions").execute();
    await (db as Kysely<Extended>)
      .deleteFrom("ecr_rr_rule_summaries")
      .execute();
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
    const resp = await saveExtendedMetadata(badMetadata, "1-2-3-4");

    expect(resp.message).toEqual("Failed to insert metadata to database.");
    expect(resp.status).toEqual(500);
  });
});

const baseCoreMetadata: BundleMetadata = {
  last_name: "lname",
  first_name: "fname",
  birth_date: "01/01/2000",
  data_source: "s3",
  eicr_set_id: "1234",
  eicr_version_number: "1",
  rr: [],
  report_date: "12/20/2024",
};

describe("saveCoreMetadata", () => {
  beforeAll(async () => {
    await db.schema
      .createTable("ecr_data")
      .addColumn("eICR_ID", "varchar(200)", (cb) => cb.primaryKey())
      .addColumn("set_id", "varchar(255)")
      .addColumn("eicr_version_number", "varchar(50)")
      .addColumn("data_source", "varchar(2)", (cb) => cb.notNull()) // S3 or DB
      .addColumn("fhir_reference_link", "varchar(500)")
      .addColumn("patient_name_first", "varchar(100)", (cb) => cb.notNull())
      .addColumn("patient_name_last", "varchar(100)", (cb) => cb.notNull())
      .addColumn("patient_birth_date", "date", (cb) => cb.notNull())
      .addColumn("date_created", "timestamptz", (cb) =>
        cb.notNull().defaultTo(sql`NOW()`),
      )
      .addColumn("report_date", "date", (cb) => cb.notNull())
      .execute();
    await db.schema
      .createTable("ecr_rr_conditions")
      .addColumn("uuid", "varchar(200)", (cb) => cb.primaryKey())
      .addColumn("eICR_ID", "varchar(255)", (cb) => cb.notNull())
      .addColumn("condition", "varchar")
      .execute();
    await db.schema
      .createTable("ecr_rr_rule_summaries")
      .addColumn("uuid", "varchar(200)", (cb) => cb.primaryKey())
      .addColumn("ecr_rr_conditions_id", "varchar(200)")
      .addColumn("rule_summary", "varchar")
      .execute();
  });

  afterAll(async () => {
    await db.schema.dropTable("ecr_data").execute();
    await db.schema.dropTable("ecr_rr_conditions").execute();
    await db.schema.dropTable("ecr_rr_rule_summaries").execute();
  });

  afterEach(async () => {
    await (db as Kysely<Core>).deleteFrom("ecr_data").execute();
    await (db as Kysely<Core>).deleteFrom("ecr_rr_conditions").execute();
    await (db as Kysely<Core>).deleteFrom("ecr_rr_rule_summaries").execute();
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
    const badMetadata = {
      last_name: null,
      first_name: null,
      birth_date: "01/01/2000",
      data_source: "s3",
      eicr_set_id: "1234",
      eicr_version_number: "1",
      rr: [],
      report_date: new Date("12/20/2024"),
    } as unknown as BundleMetadata;
    const resp = await saveCoreMetadata(badMetadata, "1-2-3-4");

    expect(resp.message).toEqual("Failed to insert metadata to database.");
    expect(resp.status).toEqual(500);
  });
});
