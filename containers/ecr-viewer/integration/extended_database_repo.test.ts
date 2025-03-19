/**
 * @jest-environment node
 */

import {
  buildExtended,
  clearExtended,
  dropExtended,
} from "@/app/api/services/db_schema";
import * as extended_database_repo from "@/app/api/services/extended_database_repo";
import { NewExtendedECR } from "@/app/api/services/extended_types";

describe("extended_database_repo", () => {
  beforeAll(async () => {
    await buildExtended();
  });

  afterAll(async () => {
    await dropExtended();
  });

  describe("ecr_data", () => {
    const template: NewExtendedECR = {
      eICR_ID: "12345",
      set_id: "12345",
      fhir_reference_link: "http://example.com",
      last_name: "Kenobi",
      first_name: "Obi-Wan",
      birth_date: new Date("2024-12-31T05:00:00.000Z"),
      gender: "Based",
      birth_sex: "Based",
      gender_identity: "Based",
      race: "Star Guy",
      ethnicity: "Star Guy",
      latitude: 0.0,
      longitude: 0.0,
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
      authoring_date: new Date("2024-12-31T05:00:00.000Z"),
      authoring_provider: "Dr. Droid",
      provider_id: "12345",
      facility_id: "12345",
      facility_name: "Jedi Temple",
      encounter_type: "Checkup",
      encounter_start_date: new Date("2024-12-31T05:00:00.000Z"),
      encounter_end_date: new Date("2024-12-31T05:00:00.000Z"),
      reason_for_visit: "Checkup",
      active_problems: "Dead",
      date_created: new Date("2025-01-01"),
    };
    beforeEach(async () => {
      await extended_database_repo.createExtendedEcr(template);
      await extended_database_repo.createExtendedEcr({
        ...template,
        eICR_ID: "54321",
        first_name: "Anakin",
      });
    });

    afterEach(async () => {
      await clearExtended();
    });

    it("should find an ECR with a given eICR_ID", async () => {
      const actual = await extended_database_repo.findExtendedEcrById("12345");
      expect(actual).toEqual({
        ...template,
        active_problems: expect.stringContaining("Dead"),
      });
    });

    it("should find all people named Obi-Wan", async () => {
      const actual = await extended_database_repo.findExtendedEcr({
        first_name: "Obi-Wan",
      });
      expect(actual).toEqual([
        {
          ...template,
          active_problems: expect.stringContaining("Dead"),
        },
      ]);
    });

    it("should update patient_name_last of a person with a given id", async () => {
      await extended_database_repo.updateExtendedEcr("12345", {
        last_name: "Grievous",
      });
      const actual = await extended_database_repo.findExtendedEcrById("12345");
      expect(actual?.last_name).toEqual("Grievous");
    });

    it("should create an ECR", async () => {
      await extended_database_repo.createExtendedEcr({
        ...template,
        eICR_ID: "123",
      });
      const actual = await extended_database_repo.findExtendedEcrById("123");
      expect(actual).toEqual({
        ...template,
        eICR_ID: "123",
        active_problems: expect.stringContaining("Dead"),
      });
    });

    it("should delete an ECR with a given id", async () => {
      await extended_database_repo.deleteExtendedEcr("12345");
      const actual = await extended_database_repo.findExtendedEcrById("12345");
      expect(actual).toBeUndefined();
    });
  });

  // patient_address
  describe("patient_address", () => {
    const template = {
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
      period_start: new Date("2024-12-31T05:00:00.000Z"),
      period_end: new Date("2025-02-06T05:00:00.000Z"),
      eICR_ID: "12345",
    };
    beforeEach(async () => {
      await extended_database_repo.createAddress(template);
      await extended_database_repo.createAddress({
        ...template,
        uuid: "54321",
        city: "Mustafar",
        eICR_ID: "54321",
      });
    });

    afterEach(async () => {
      await clearExtended();
    });

    it("should find an address with a given uuid", async () => {
      const actual = await extended_database_repo.findAddressById("12345");
      expect(actual).toEqual({
        ...template,
        line: expect.stringContaining("Apt 2"),
      });
    });

    it("should find all registered addresses within a given city", async () => {
      const actual = await extended_database_repo.findAddress({
        city: "Coruscant",
      });
      expect(actual).toEqual([
        {
          ...template,
          line: expect.stringContaining("Apt 2"),
        },
      ]);
    });

    it("should update the address with a given id", async () => {
      await extended_database_repo.updateAddress("12345", { city: "Mustafar" });
      const actual = await extended_database_repo.findAddressById("12345");
      expect(actual?.city).toEqual("Mustafar");
    });

    it("should create an address", async () => {
      await extended_database_repo.createAddress({
        ...template,
        uuid: "123",
      });
      const actual = await extended_database_repo.findAddressById("123");
      expect(actual).toEqual({
        ...template,
        uuid: "123",
        line: expect.stringContaining("Apt 2"),
      });
    });

    it("should delete an address with a given id", async () => {
      await extended_database_repo.deleteAddress("12345");
      const actual = await extended_database_repo.findAddressById("12345");
      expect(actual).toBeUndefined();
    });
  });

  // ecr_labs
  describe("ecr_labs", () => {
    const template = {
      uuid: "12345",
      eICR_ID: "123",
      test_type: "Evil",
      test_type_code: "12345",
      test_type_system: "Magic Detector",
      test_result_qualitative: "Guilty",
      test_result_quantitative: 1,
      test_result_units: "Mana",
      test_result_code: "12345",
      test_result_code_display: "Dark Magic",
      test_result_code_system: "Magic Detector",
      test_result_interpretation: "Extra Evil",
      test_result_interpretation_code: "54321",
      test_result_interpretation_system: "Magic Detector",
      test_result_reference_range_low_value: 5,
      test_result_reference_range_low_units: "MP",
      test_result_reference_range_high_value: 7,
      test_result_reference_range_high_units: "MP",
      specimen_type: "Blood",
      specimen_collection_date: new Date("2024-12-31T05:00:00.000Z"),
      performing_lab: "Atlanta, GA",
    };
    beforeEach(async () => {
      await extended_database_repo.createLab(template);
      await extended_database_repo.createLab({
        ...template,
        uuid: "54321",
        eICR_ID: "321",
        test_type: "Good",
      });
    });

    afterEach(async () => {
      await clearExtended();
    });
    it("should find a lab with a given uuid", async () => {
      const actual = await extended_database_repo.findLabById("12345");
      expect(actual).toEqual(template);
    });

    it("should find all labs with test_type Evil", async () => {
      const actual = await extended_database_repo.findLab({
        test_type: "Evil",
      });
      expect(actual).toEqual([{ ...template }]);
    });

    it("should update the lab with a given id", async () => {
      await extended_database_repo.updateLab("12345", {
        test_result_code: "FAIL",
      });
      const actual = await extended_database_repo.findLabById("12345");
      expect(actual?.test_result_code).toEqual("FAIL");
    });

    it("should create a lab", async () => {
      await extended_database_repo.createLab({ ...template, uuid: "123" });
      const actual = await extended_database_repo.findLabById("123");
      expect(actual).toEqual({ ...template, uuid: "123" });
    });

    it("should delete a lab with a given id", async () => {
      await extended_database_repo.deleteLab("12345");
      const actual = await extended_database_repo.findLabById("12345");
      expect(actual).toBeUndefined();
    });
  });

  // ecr_rr_conditions
  describe("ecr_rr_conditions", () => {
    const template = {
      eICR_ID: "12345",
      uuid: "123",
      condition: "Dark Magic",
    };
    beforeEach(async () => {
      await extended_database_repo.createEcrCondition(template);
      await extended_database_repo.createEcrCondition({
        ...template,
        eICR_ID: "54321",
        uuid: "321",
        condition: "Good Magic",
      });
    });

    afterEach(async () => {
      await clearExtended();
    });
    it("should find a conditions with a given uuid", async () => {
      const actual = await extended_database_repo.findEcrConditionById("123");
      expect(actual).toEqual(template);
    });

    it("should find all conditions named Dark Magic", async () => {
      const actual = await extended_database_repo.findEcrCondition({
        condition: "Dark Magic",
      });
      expect(actual).toEqual([{ ...template, uuid: "123" }]);
    });

    it("should update the condition with a given id", async () => {
      await extended_database_repo.updateEcrCondition("123", {
        condition: "Extra Dark Magic",
      });
      const actual = await extended_database_repo.findEcrConditionById("123");
      expect(actual?.condition).toEqual("Extra Dark Magic");
    });

    it("should create a condition", async () => {
      await extended_database_repo.createEcrCondition({
        eICR_ID: "12345",
        uuid: "54321",
        condition: "Dark Magic",
      });
      const actual = await extended_database_repo.findEcrConditionById("54321");
      expect(actual).toEqual({ ...template, uuid: "54321" });
    });

    it("should delete a condition with a given id", async () => {
      await extended_database_repo.deleteEcrCondition("12345");
      const actual = await extended_database_repo.findEcrConditionById("12345");
      expect(actual).toBeUndefined();
    });
  });

  // ecr_rr_rule_summaries
  describe("ecr_rr_rule_summaries", () => {
    const template = {
      ecr_rr_conditions_id: "12345",
      uuid: "12345",
      rule_summary: "Dark Magic",
    };
    beforeEach(async () => {
      await extended_database_repo.createEcrRule(template);
      await extended_database_repo.createEcrRule({
        ...template,
        uuid: "54321",
        rule_summary: "Real Bad Magic",
      });
    });

    afterEach(async () => {
      await clearExtended();
    });

    it("should find a rule summary with a given uuid", async () => {
      const actual = await extended_database_repo.findEcrRuleById("12345");
      expect(actual).toEqual(template);
    });

    it("should find all rule summaries named Dark Magic", async () => {
      const actual = await extended_database_repo.findEcrRule({
        rule_summary: "Dark Magic",
      });
      expect(actual[0]).toEqual(template);
    });

    it("should update the rule summary with a given id", async () => {
      await extended_database_repo.updateEcrRule("12345", {
        rule_summary: "Extra Dark Magic",
      });
      const actual = await extended_database_repo.findEcrRuleById("12345");
      expect(actual?.rule_summary).toEqual("Extra Dark Magic");
    });

    it("should create a rule summary", async () => {
      await extended_database_repo.createEcrRule({
        ecr_rr_conditions_id: "12345",
        uuid: "123",
        rule_summary: "Dark Magic",
      });
      const actual = await extended_database_repo.findEcrRuleById("123");
      expect(actual).toEqual({ ...template, uuid: "123" });
    });

    it("should delete a rule summary with a given id", async () => {
      await extended_database_repo.deleteEcrRule("12345");
      const actual = await extended_database_repo.findEcrRuleById("12345");
      expect(actual).toBeUndefined();
    });
  });
});
