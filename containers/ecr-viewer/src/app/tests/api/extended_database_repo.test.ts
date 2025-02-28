/**
 * @jest-environment node
 */

import { db } from "../../api/services/database";
import { sql } from "kysely";
import * as extended_database_repo from "../../api/services/extended_database_repo";

// ecr_data
describe("ecr_data", () => {
  beforeAll(async () => {
    await db.schema
      .createTable("ecr_data")
      .addColumn("eICR_ID", "varchar(200)", (cb) => cb.primaryKey())
      .addColumn("set_id", "varchar(255)")
      .addColumn("fhir_reference_link", "varchar(255)")
      .addColumn("last_name", "varchar(255)")
      .addColumn("first_name", "varchar(255)")
      .addColumn("birth_date", "date")
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
      .addColumn("authoring_date", "date", (cb) => cb.notNull())
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
  });

  afterAll(async () => {
    await db.schema.dropTable("ecr_data").execute();
  });

  it("should find an ECR with a given eICR_ID", async () => {
    await extended_database_repo.findExtendedEcrById("12345");
  });

  it("should find all people named General", async () => {
    await extended_database_repo.findExtendedEcr({ first_name: "General" });
  });

  it("should update patient_name_last of a person with a given id", async () => {
    await extended_database_repo.updateExtendedEcr("12345", {
      last_name: "Grievous",
    });
  });

  it("should create an ECR", async () => {
    await extended_database_repo.createExtendedEcr({
      eICR_ID: "12345",
      set_id: "12345",
      fhir_reference_link: "http://example.com",
      last_name: "Kenobi",
      first_name: "Obi-Wan",
      birth_date: "2025-01-01",
      gender: "Based",
      birth_sex: "Based",
      gender_identity: "Based",
      race: "Star Guy",
      ethnicity: "Star Guy",
      latitude: 0,
      longitude: 0,
      homelessness_status: "Homeless",
      disabilities: "None",
      tribal_affiliation: "None",
      tribal_enrollment_status: "None",
      current_job_title: "Jedi Master",
      current_job_industry: "Jedi Order",
      usual_occupation: "Jedi Master",
      usual_industry: "Jedi Order",
      preferred_language: "Galactic Basic",
      pregnancy_status: "Not Pregnant",
      rr_id: "12345",
      processing_status: "Processed",
      eicr_version_number: "1.0",
      authoring_date: "2025-01-01",
      authoring_provider: "Dr. Droid",
      provider_id: "12345",
      facility_id: "12345",
      facility_name: "Jedi Temple",
      encounter_type: "Checkup",
      encounter_start_date: "2025-01-01",
      encounter_end_date: "2025-01-01",
      reason_for_visit: "Checkup",
      active_problems: "Dead",
      date_created: "2025-01-01",
    });
  });

  it("should delete an ECR with a given id", async () => {
    await extended_database_repo.deleteExtendedEcr("12345");
  });
});

// patient_address
describe("patient_address", () => {
  beforeAll(async () => {
    await db.schema
      .createTable("patient_address")
      .addColumn("uuid", "varchar(200)", (cb) => cb.primaryKey())
      .addColumn("use", "varchar(7)")
      .addColumn("type", "varchar(8)")
      .addColumn("text", "varchar")
      .addColumn("line", "varchar(255)")
      .addColumn("city", "varchar(255)")
      .addColumn("district", "varchar(255)")
      .addColumn("state", "varchar(255)")
      .addColumn("postal_code", "varchar(20)")
      .addColumn("country", "varchar(255)")
      .addColumn("period_start", "date")
      .addColumn("period_end", "date")
      .addColumn("eICR_ID", "varchar(200)")
      .execute();
  });

  afterAll(async () => {
    await db.schema.dropTable("patient_address").execute();
  });

  it("should find an address with a given uuid", async () => {
    await extended_database_repo.findAddressById("12345");
  });

  it("should find all registered addresses within a given city", async () => {
    await extended_database_repo.findAddress({ city: "Coruscant" });
  });

  it("should update the address with a given id", async () => {
    await extended_database_repo.updateAddress("12345", { city: "Mustafar" });
  });

  it("should create an address", async () => {
    await extended_database_repo.createAddress({
      uuid: "12345",
      use: "home",
      type: "postal",
      text: "1234 Main St",
      line: "Apt 2",
      city: "Coruscant",
      district: "Galactic City",
      state: "Coruscant",
      postal_code: "12345",
      country: "Republic",
      period_start: "2025-01-01",
      period_end: "2025-02-07",
      eICR_ID: "12345",
    });
  });

  it("should delete an address with a given id", async () => {
    await extended_database_repo.deleteAddress("12345");
  });
});

// ecr_labs
describe("ecr_labs", () => {
  beforeAll(async () => {
    await db.schema
      .createTable("ecr_labs")
      .addColumn("uuid", "varchar(200)", (cb) => cb.primaryKey())
      .addColumn("eICR_ID", "varchar(255)", (cb) => cb.notNull())
      .addColumn("test_type", "varchar(255)")
      .addColumn("test_type_code", "varchar(50)")
      .addColumn("test_type_system", "varchar(255)")
      .addColumn("test_result_qualitative", "text")
      .addColumn("test_result_quantitative", "numeric")
      .addColumn("test_result_units", "varchar(50)")
      .addColumn("test_result_code", "varchar(50)")
      .addColumn("test_result_code_display", "varchar(255)")
      .addColumn("test_result_code_system", "varchar(50)")
      .addColumn("test_result_interpretation", "varchar(255)")
      .addColumn("test_result_interpretation_code", "varchar(50)")
      .addColumn("test_result_interpretation_system", "varchar")
      .addColumn("test_result_reference_range_low_value", "numeric")
      .addColumn("test_result_reference_range_low_units", "varchar(50)")
      .addColumn("test_result_reference_range_high_value", "numeric")
      .addColumn("test_result_reference_range_high_units", "varchar(50)")
      .addColumn("specimen_type", "varchar(255)")
      .addColumn("specimen_collection_date", "date")
      .addColumn("performing_lab", "varchar")
      .execute();
  });

  afterAll(async () => {
    await db.schema.dropTable("ecr_labs").execute();
  });

  it("should find a lab with a given uuid", async () => {
    await extended_database_repo.findLabById("12345");
  });

  it("should find all labs with test_type Dark Magic", async () => {
    await extended_database_repo.findLab({ test_type: "Dark Magic" });
  });

  it("should update the lab with a given id", async () => {
    await extended_database_repo.updateLab("12345", {
      test_result_code: "FAIL",
    });
  });

  it("should create a lab", async () => {
    await extended_database_repo.createLab({
      uuid: "setid",
      eICR_ID: "12345",
      test_type: "Dark Magic",
      test_type_code: "12345",
      test_type_system: "Magic",
      test_result_qualitative: "Magic",
      test_result_quantitative: 0,
      test_result_units: "Magic",
      test_result_code: "Magic",
      test_result_code_display: "Magic",
      test_result_code_system: "Magic",
      test_result_interpretation: "Magic",
      test_result_interpretation_code: "Magic",
      test_result_interpretation_system: "Magic",
      test_result_reference_range_low_value: 0,
      test_result_reference_range_low_units: "Magic",
      test_result_reference_range_high_value: 0,
      test_result_reference_range_high_units: "Magic",
      specimen_type: "Magic",
      specimen_collection_date: "2025-01-01",
      performing_lab: "Magic",
    });
  });

  it("should delete a lab with a given id", async () => {
    await extended_database_repo.deleteLab("12345");
  });
});

// ecr_rr_conditions
describe("ecr_rr_conditions", () => {
  beforeAll(async () => {
    await db.schema
      .createTable("ecr_rr_conditions")
      .addColumn("uuid", "varchar(200)", (cb) => cb.primaryKey())
      .addColumn("eICR_ID", "varchar(255)", (cb) => cb.notNull())
      .addColumn("condition", "varchar")
      .execute();
  });

  afterAll(async () => {
    await db.schema.dropTable("ecr_rr_conditions").execute();
  });

  it("should find a conditions with a given uuid", async () => {
    await extended_database_repo.findEcrConditionById("12345");
  });

  it("should find all conditions named Dark Magic", async () => {
    await extended_database_repo.findEcrCondition({ condition: "Dark Magic" });
  });

  it("should update the condition with a given id", async () => {
    await extended_database_repo.updateEcrCondition("12345", {
      condition: "Extra Dark Magic",
    });
  });

  it("should create a condition", async () => {
    await extended_database_repo.createEcrCondition({
      eICR_ID: "12345",
      uuid: "setid",
      condition: "Dark Magic",
    });
  });

  it("should delete a condition with a given id", async () => {
    await extended_database_repo.deleteEcrCondition("12345");
  });
});

// ecr_rr_rule_summaries
describe("ecr_rr_rule_summaries", () => {
  beforeAll(async () => {
    await db.schema
      .createTable("ecr_rr_rule_summaries")
      .addColumn("uuid", "varchar(200)", (cb) => cb.primaryKey())
      .addColumn("ecr_rr_conditions_id", "varchar(200)")
      .addColumn("rule_summary", "varchar")
      .execute();
  });

  afterAll(async () => {
    await db.schema.dropTable("ecr_rr_rule_summaries").execute();
  });

  it("should find a rule summary with a given uuid", async () => {
    await extended_database_repo.findEcrRuleById("12345");
  });

  it("should find all rule summaries named Dark Magic", async () => {
    await extended_database_repo.findEcrRule({ rule_summary: "Dark Magic" });
  });

  it("should update the rule summary with a given id", async () => {
    await extended_database_repo.updateEcrRule("12345", {
      rule_summary: "Extra Dark Magic",
    });
  });

  it("should create a rule summary", async () => {
    await extended_database_repo.createEcrRule({
      ecr_rr_conditions_id: "12345",
      uuid: "setid",
      rule_summary: "Dark Magic",
    });
  });

  it("should delete a rule summary with a given id", async () => {
    await extended_database_repo.deleteEcrRule("12345");
  });
});
