/**
 * @jest-environment node
 */

import * as database_repo from "@/app/api/services/core_database_repo";
import { NewECR } from "@/app/api/services/core_types";
import { buildCore, clearCore, dropCore } from "@/app/api/services/db_schema";

describe("database_repo", () => {
  beforeAll(async () => {
    await buildCore();
  });

  afterAll(async () => {
    await dropCore();
  });

  describe("ecr_data", () => {
    const expected: NewECR = {
      eICR_ID: "12345",
      set_id: "setid",
      data_source: "DB",
      fhir_reference_link: "link",
      eicr_version_number: "50000",
      patient_name_first: "Boba",
      patient_name_last: "Fett",
      patient_birth_date: new Date("1969-02-11"),
      date_created: new Date("2025-01-01"),
      report_date: new Date("2025-02-07"),
    };
    beforeEach(async () => {
      await database_repo.createEcr(expected);
    });

    afterEach(async () => {
      await clearCore();
    });

    it("should find an ECR with a given eICR_ID", async () => {
      const actual = await database_repo.findEcrById("12345");
      expect(actual).toEqual(expected);
    });

    it("should find all people named Boba", async () => {
      const actual = await database_repo.findEcr({
        patient_name_first: "Boba",
      });
      expect(actual[0]).toEqual(expected);
    });

    it("should update patient_name_last of a person with a given id", async () => {
      await database_repo.updateEcr("12345", { patient_name_last: "Grievous" });
      const actual = await database_repo.findEcrById("12345");
      expect(actual?.patient_name_last).toEqual("Grievous");
    });

    it("should create an ECR", async () => {
      const data: NewECR = {
        eICR_ID: "54321",
        set_id: "setid",
        data_source: "DB",
        fhir_reference_link: "link",
        eicr_version_number: "50000",
        patient_name_first: "Boba",
        patient_name_last: "Fett",
        patient_birth_date: new Date("1969-02-11"),
        date_created: new Date("2025-01-01"),
        report_date: new Date("2025-02-07"),
      };
      await database_repo.createEcr(data);
      const actual = await database_repo.findEcrById("54321");
      expect(actual).toEqual(data);
    });

    it("should delete an ECR with a given id", async () => {
      await database_repo.deleteEcr("12345");
      const actual = await database_repo.findEcrById("12345");
      expect(actual).toBeUndefined();
    });
  });

  // ecr_rr_conditions
  describe("ecr_rr_conditions", () => {
    const expected = {
      eICR_ID: "12345",
      uuid: "12345",
      condition: "Dark Magic",
    };
    beforeEach(async () => {
      await database_repo.createEcrCondition(expected);
    });

    afterEach(async () => {
      await clearCore();
    });

    it("should find a conditions with a given uuid", async () => {
      const actual = await database_repo.findEcrConditionById("12345");
      expect(actual).toEqual(expected);
    });

    it("should find all conditions named Dark Magic", async () => {
      const actual = await database_repo.findEcrCondition({
        condition: "Dark Magic",
      });
      expect(actual[0]).toEqual(expected);
    });

    it("should update the condition with a given id", async () => {
      await database_repo.updateEcrCondition("12345", {
        condition: "Extra Dark Magic",
      });
      const actual = await database_repo.findEcrConditionById("12345");
      expect(actual?.condition).toEqual("Extra Dark Magic");
    });

    it("should create a condition", async () => {
      await database_repo.createEcrCondition({
        eICR_ID: "12345",
        uuid: "54321",
        condition: "Dark Magic",
      });
      const actual = await database_repo.findEcrConditionById("54321");
      expect(actual).toEqual({
        eICR_ID: "12345",
        uuid: "54321",
        condition: "Dark Magic",
      });
    });

    it("should delete a condition with a given id", async () => {
      await database_repo.deleteEcrCondition("12345");
      const actual = await database_repo.findEcrConditionById("12345");
      expect(actual).toBeUndefined();
    });
  });

  // ecr_rr_rule_summaries
  describe("ecr_rr_rule_summaries", () => {
    const expected = {
      uuid: "12345",
      ecr_rr_conditions_id: "54321",
      rule_summary: "Dark Magic",
    };

    beforeEach(async () => {
      await database_repo.createEcrRule(expected);
    });

    afterEach(async () => {
      await clearCore();
    });

    it("should find a rule summary with a given uuid", async () => {
      const actual = await database_repo.findEcrRuleById("12345");
      expect(actual).toEqual(expected);
    });

    it("should find all rule summaries named Dark Magic", async () => {
      const actual = await database_repo.findEcrRule({
        rule_summary: "Dark Magic",
      });
      expect(actual[0]).toEqual(expected);
    });

    it("should update the rule summary with a given id", async () => {
      await database_repo.updateEcrRule("12345", {
        rule_summary: "Extra Dark Magic",
      });
      const actual = await database_repo.findEcrRuleById("12345");
      expect(actual?.rule_summary).toEqual("Extra Dark Magic");
    });

    it("should create a rule summary", async () => {
      await database_repo.createEcrRule({
        uuid: "54321",
        ecr_rr_conditions_id: "12345",
        rule_summary: "Dark Magic",
      });
      const actual = await database_repo.findEcrRuleById("54321");
      expect(actual).toEqual({
        uuid: "54321",
        ecr_rr_conditions_id: "12345",
        rule_summary: "Dark Magic",
      });
    });

    it("should delete a rule summary with a given id", async () => {
      await database_repo.deleteEcrRule("12345");
      const actual = await database_repo.findEcrRuleById("12345");
      expect(actual).toBeUndefined();
    });
  });
});
