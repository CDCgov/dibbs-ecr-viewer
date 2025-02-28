/**
 * @jest-environment node
 */

import { sql } from "kysely";
import { db } from "../../api/services/database";
import * as database_repo from "../../api/services/database_repo";

// ecr_data
describe("ecr_data", () => {
  beforeAll(async () => {
    await db.schema
      .createTable("ecr_data")
      .addColumn("eICR_ID", "varchar(200)", (cb) => cb.primaryKey())
      .addColumn("set_id", "varchar(255)")
      .addColumn("eicr_version_number", "varchar(50)")
      .addColumn("data_source", "varchar(2)") // S3 or DB
      .addColumn("fhir_reference_link", "varchar(500)")
      .addColumn("patient_name_first", "varchar(100)")
      .addColumn("patient_name_last", "varchar(100)")
      .addColumn("patient_birth_date", "date")
      .addColumn("date_created", "timestamptz", (cb) =>
        cb.notNull().defaultTo(sql`NOW()`),
      )
      .addColumn("report_date", "date")
      .execute();
  });

  afterAll(async () => {
    await db.schema.dropTable("ecr_data").execute();
  });

  it("should find an ECR with a given eICR_ID", async () => {
    await database_repo.findEcrById("12345");
  });

  it("should find all people named General", async () => {
    await database_repo.findEcr({ patient_name_first: "General" });
  });

  it("should update patient_name_last of a person with a given id", async () => {
    await database_repo.updateEcr("12345", { patient_name_last: "Grievous" });
  });

  it("should create an ECR", async () => {
    await database_repo.createEcr({
      eICR_ID: "12345",
      set_id: "setid",
      data_source: "DB",
      fhir_reference_link: "link",
      eicr_version_number: "50000",
      patient_name_first: "Boba",
      patient_name_last: "Fett",
      patient_birth_date: "1969-02-11", // Kysely formats these strings as necessary
      date_created: "2025-01-01",
      report_date: "2025-02-07",
    });
  });

  it("should delete an ECR with a given id", async () => {
    await database_repo.deleteEcr("12345");
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
    await database_repo.findEcrConditionById("12345");
  });

  it("should find all conditions named Dark Magic", async () => {
    await database_repo.findEcrCondition({ condition: "Dark Magic" });
  });

  it("should update the condition with a given id", async () => {
    await database_repo.updateEcrCondition("12345", {
      condition: "Extra Dark Magic",
    });
  });

  it("should create a condition", async () => {
    await database_repo.createEcrCondition({
      eICR_ID: "12345",
      uuid: "setid",
      condition: "Dark Magic",
    });
  });

  it("should delete a condition with a given id", async () => {
    await database_repo.deleteEcrCondition("12345");
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
    await database_repo.findEcrRuleById("12345");
  });

  it("should find all rule summaries named Dark Magic", async () => {
    await database_repo.findEcrRule({ rule_summary: "Dark Magic" });
  });

  it("should update the rule summary with a given id", async () => {
    await database_repo.updateEcrRule("12345", {
      rule_summary: "Extra Dark Magic",
    });
  });

  it("should create a rule summary", async () => {
    await database_repo.createEcrRule({
      ecr_rr_conditions_id: "12345",
      uuid: "setid",
      rule_summary: "Dark Magic",
    });
  });

  it("should delete a rule summary with a given id", async () => {
    await database_repo.deleteEcrRule("12345");
  });
});
