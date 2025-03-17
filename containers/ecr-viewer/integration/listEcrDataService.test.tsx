/**
 * @jest-environment node
 */
import { formatDate, formatDateTime } from "@/app/services/formatDateService";
import {
  CoreMetadataModel,
  EcrDisplay,
  generateFilterConditionsStatement,
  generateCoreSearchStatement,
  generateCoreWhereStatement,
  getTotalEcrCount,
  processCoreMetadata,
  listEcrData,
  generateFilterDateStatement,
} from "@/app/services/listEcrDataService";
import {
  buildExtended,
  dropExtended,
  clearExtended,
  buildCore,
  dropCore,
  clearCore,
  buildCoreAlias,
  dropCoreAlias,
  clearCoreAlias,
  buildExtendedAlias,
  dropExtendedAlias,
  clearExtendedAlias,
} from "@/app/api/services/db_schema";
import * as extended_database_repo from "@/app/api/services/extended_database_repo";
import * as core_database_repo from "@/app/api/services/core_database_repo";
import { db } from "@/app/api/services/database";
import { ExpressionBuilder, sql } from "kysely";

const testDateRange = {
  startDate: new Date("12-01-2024"),
  endDate: new Date("12-03-2024"),
};

const coreTemplate = {
  eICR_ID: "12345",
  set_id: "123",
  data_source: "DB",
  fhir_reference_link: "",
  eicr_version_number: "1",
  patient_name_first: "Billy",
  patient_name_last: "Bob",
  patient_birth_date: new Date("2024-12-01T12:00:00Z"),
  date_created: new Date("2024-12-02T12:00:00Z"),
  report_date: new Date("2024-12-02T12:00:00Z"),
};

const extendedTemplate = {
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
  authoring_date: new Date("2024-12-02T05:00:00.000Z"),
  authoring_provider: "Dr. Droid",
  provider_id: "12345",
  facility_id: "12345",
  facility_name: "Jedi Temple",
  encounter_type: "Checkup",
  encounter_start_date: new Date("2024-12-02T05:00:00.000Z"),
  encounter_end_date: new Date("2024-12-02T05:00:00.000Z"),
  reason_for_visit: "Checkup",
  active_problems: ["Dead"],
  date_created: new Date("2024-12-02T12:00:00Z"),
};

// Tests rewritten to fit Kysely in following commit

const mockExpressionBuilder = {
  and: jest.fn((conditions) => conditions.filter(Boolean)), // Mimics AND conditions
  or: jest.fn((conditions) => conditions.filter(Boolean)), // Mimics OR conditions
  exists: jest.fn((subQuery) => sql`${subQuery}`), // Simulates EXISTS subquery
} as unknown as ExpressionBuilder<any, any>;

describe("listEcrDataService", () => {
  describe("process Metadata", () => {
    it("should return an empty array when responseBody is empty", () => {
      const result = processCoreMetadata([]);
      expect(result).toEqual([]);
    });

    it("should map each object in responseBody to the correct output structure", () => {
      const date1 = new Date();
      const date2 = new Date();
      const date3 = new Date();

      const responseBody: CoreMetadataModel[] = [
        {
          eicr_id: "ecr1",
          date_created: date1,
          patient_name_first: "Test",
          patient_name_last: "Person",
          patient_birth_date: date2,
          report_date: date3,
          conditions: ["Long"],
          rule_summaries: ["Longer"],
          data_source: "DB",
          data_link: "",
          set_id: "123",
          eicr_version_number: "1",
        },
        {
          eicr_id: "ecr2",
          date_created: date1,
          patient_name_first: "Another",
          patient_name_last: "Test",
          patient_birth_date: date2,
          report_date: date3,
          conditions: ["Stuff"],
          rule_summaries: ["Other stuff", "Even more stuff"],
          data_source: "DB",
          data_link: "",
          set_id: "124",
          eicr_version_number: "1",
        },
      ];

      const expected: EcrDisplay[] = [
        {
          ecrId: "ecr1",
          date_created: formatDateTime(date1.toISOString()),
          patient_first_name: "Test",
          patient_last_name: "Person",
          patient_date_of_birth: formatDate(date2.toISOString()),
          patient_report_date: formatDateTime(date3.toISOString()),
          reportable_conditions: expect.arrayContaining(["Long"]),
          rule_summaries: expect.arrayContaining(["Longer"]),
          eicr_set_id: "123",
          eicr_version_number: "1",
        },
        {
          ecrId: "ecr2",
          date_created: formatDateTime(date1.toISOString()),
          patient_first_name: "Another",
          patient_last_name: "Test",
          patient_date_of_birth: formatDate(date2.toISOString()),
          patient_report_date: formatDateTime(date3.toISOString()),
          reportable_conditions: expect.arrayContaining(["Stuff"]),
          rule_summaries: expect.arrayContaining([
            "Other stuff",
            "Even more stuff",
          ]),
          eicr_set_id: "124",
          eicr_version_number: "1",
        },
      ];
      const result = processCoreMetadata(responseBody);
      expect(result).toEqual(expected);
    });
  });

  describe("listCoreEcrData", () => {
    beforeAll(async () => {
      process.env.METADATA_DATABASE_SCHEMA = "core";
      await buildCore();
    });

    afterAll(async () => {
      await dropCore();
    });

    beforeEach(async () => {
      await core_database_repo.createEcr(coreTemplate);
      await core_database_repo.createEcrCondition({
          uuid: "12345",
          eICR_ID: "12345",
          condition: "Condition1",
        })
      await core_database_repo.createEcrRule({
          uuid: "12345",
          ecr_rr_conditions_id: "12345",
          rule_summary: "Rule1",
        })
    });

    afterEach(async () => {
      await clearCore();
    });

    it("should return empty array when no data is found", async () => {
      await clearCore();
      const startIndex = 0;
      const itemsPerPage = 25;
      const columnName = "date_created";
      const direction = "DESC";

      const result = await listEcrData(
        startIndex,
        itemsPerPage,
        columnName,
        direction,
        testDateRange,
      );

      expect(result).toBeEmpty();
    });

    it("should return data when found", async () => {
      const startIndex = 0;
      const itemsPerPage = 25;
      const columnName = "date_created";
      const direction = "DESC";
      const actual: EcrDisplay[] = await listEcrData(
        startIndex,
        itemsPerPage,
        columnName,
        direction,
        testDateRange,
      );
      expect(actual).toEqual([
        {
          date_created: "12/02/2024 7:00\u00A0AM\u00A0EST",
          ecrId: "12345",
          patient_date_of_birth: "12/01/2024",
          patient_first_name: "Billy",
          patient_last_name: "Bob",
          patient_report_date: "12/02/2024 12:00\u00A0AM\u00A0EST",
          reportable_conditions: ["Condition1"],
          rule_summaries: ["Rule1"],
          eicr_set_id: "123",
          eicr_version_number: "1",
        },
      ]);
    });

    it("should get data from the fhir_metadata table", async () => {
      const startIndex = 0;
      const itemsPerPage = 25;
      const columnName = "date_created";
      const direction = "DESC";
      const actual: EcrDisplay[] = await listEcrData(
        startIndex,
        itemsPerPage,
        columnName,
        direction,
        testDateRange,
      );
      expect(actual).toEqual([
        {
          date_created: "12/02/2024 7:00\u00A0AM\u00A0EST",
          ecrId: "12345",
          patient_date_of_birth: "12/01/2024",
          patient_first_name: "Billy",
          patient_last_name: "Bob",
          patient_report_date: "12/02/2024 12:00\u00A0AM\u00A0EST",
          reportable_conditions: ["Condition1"],
          rule_summaries: ["Rule1"],
          eicr_set_id: "123",
          eicr_version_number: "1",
        },
      ]);
    });
  });

  describe("listExtendedEcrData", () => {
    beforeAll(async () => {
      process.env.METADATA_DATABASE_SCHEMA = "extended";
      await buildExtended();
    });

    afterAll(async () => {
      await dropExtended();
    });

    beforeEach(async () => {
      await extended_database_repo.createExtendedEcr(extendedTemplate);
      await extended_database_repo.createEcrCondition({
          uuid: "12345",
          eICR_ID: "12345",
          condition: "Condition1",
        })
      await extended_database_repo.createEcrRule({
          uuid: "12345",
          ecr_rr_conditions_id: "12345",
          rule_summary: "Rule1",
        })
    });

    afterEach(async () => {
      await clearExtended();
    });

    it("should return empty array when no data is found", async () => {
      await clearExtended();
      const startIndex = 0;
      const itemsPerPage = 25;
      const columnName = "date_created";
      const direction = "DESC";

      const result = await listEcrData(
        startIndex,
        itemsPerPage,
        columnName,
        direction,
        testDateRange,
      );

      expect(result).toBeEmpty();
    });

    it("should return data when found", async () => {
      // Act
      const result = await listEcrData(
        0,
        10,
        "report_date",
        "DESC",
        testDateRange,
      );
      // Assert
      expect(result).toEqual([
        {
          date_created: "12/02/2024 7:00\u00A0AM\u00A0EST",
          ecrId: "12345",
          patient_date_of_birth: "12/31/2024",
          patient_first_name: "Obi-Wan",
          patient_last_name: "Kenobi",
          patient_report_date: "12/02/2024 12:00\u00A0AM\u00A0EST",
          reportable_conditions: ["Condition1"],
          rule_summaries: ["Rule1"],
          eicr_set_id: "12345",
          eicr_version_number: "1.0",
        },
      ]);
    });
  });

  describe("get total core ecr count", () => {
    beforeAll(async () => {
      process.env.METADATA_DATABASE_SCHEMA = "core";
      await buildCore();
    });
    afterAll(async () => {
      await dropCore();
    });

    it("should call db to get all ecrs", async () => {
      const actual = await getTotalEcrCount(testDateRange);
      expect(actual).toEqual(0);
    });
    it("should use search term in count query", async () => {
      const actual = await getTotalEcrCount(testDateRange, "blah", undefined);
      expect(actual).toEqual(0);
    });
    it("should escape the search term in count query", async () => {
      const actual = await getTotalEcrCount(
        testDateRange,
        "O'Riley",
        undefined,
      );
      expect(actual).toEqual(0);
    });
    it("should use filter conditions in count query", async () => {
      const actual = await getTotalEcrCount(testDateRange, "", [
        "Anthrax (disorder)",
      ]);
      expect(actual).toEqual(0);
    });
  });

  describe("get total extended ecr count", () => {
    beforeAll(async () => {
      process.env.METADATA_DATABASE_SCHEMA = "extended";
      await buildExtended();
    });
    afterAll(async () => {
      await dropExtended();
    });

    it("should call db to get all ecrs", async () => {
      const actual = await getTotalEcrCount(testDateRange);
      expect(actual).toEqual(0);
    });
    it("should use search term in count query", async () => {
      const actual = await getTotalEcrCount(testDateRange, "blah", undefined);
      expect(actual).toEqual(0);
    });
    it("should escape the search term in count query", async () => {
      const actual = await getTotalEcrCount(
        testDateRange,
        "O'Riley",
        undefined,
      );
      expect(actual).toEqual(0);
    });
    it("should use filter conditions in count query", async () => {
      const actual = await getTotalEcrCount(testDateRange, "", [
        "Anthrax (disorder)",
      ]);
      expect(actual).toEqual(0);
    });
  });

  describe("generate search statement", () => {
    it("should use the search term in the search statement", () => {
      expect(generateCoreSearchStatement("Dan")).toEqual(
        "ed.patient_name_first ILIKE '%Dan%' OR ed.patient_name_last ILIKE '%Dan%'",
      );
    });
    it("should escape characters when an apostrophe is added", () => {
      expect(generateCoreSearchStatement("O'Riley")).toEqual(
        "ed.patient_name_first ILIKE '%O''Riley%' OR ed.patient_name_last ILIKE '%O''Riley%'",
      );
    });
    it("should only generate true statements when no search is provided", () => {
      expect(generateCoreSearchStatement("")).toEqual(
        "NULL IS NULL OR NULL IS NULL",
      );
    });
  });

  describe("generate filter conditions statement", () => {
    it("should add conditions in the filter statement", () => {
      expect(generateFilterConditionsStatement(["Anthrax (disorder)"])).toEqual(
        "ed.eICR_ID IN (SELECT DISTINCT ed_sub.eICR_ID FROM ecr_viewer.ecr_data ed_sub LEFT JOIN ecr_viewer.ecr_rr_conditions erc_sub ON ed_sub.eICR_ID = erc_sub.eICR_ID WHERE erc_sub.condition IS NOT NULL AND (erc_sub.condition ILIKE '%Anthrax (disorder)%'))",
      );
    });
    it("should only look for eCRs with no conditions when de-selecting all conditions on filter", () => {
      expect(generateFilterConditionsStatement([""])).toEqual(
        "ed.eICR_ID NOT IN (SELECT DISTINCT erc_sub.eICR_ID FROM ecr_viewer.ecr_rr_conditions erc_sub WHERE erc_sub.condition IS NOT NULL)",
      );
    });
    it("should add date range in the filter statement", () => {
      expect(generateFilterDateStatement(testDateRange)).toEqual(
        "ed.date_created >= '2024-12-01T05:00:00.000Z' AND ed.date_created <= '2024-12-03T05:00:00.000Z'",
      );
    });
    it("should display all conditions in date range by default if no filter has been added", () => {
      expect(generateCoreWhereStatement(testDateRange, "", undefined)).toEqual(
        "(NULL IS NULL OR NULL IS NULL) AND (ed.date_created >= '2024-12-01T05:00:00.000Z' AND ed.date_created <= '2024-12-03T05:00:00.000Z') AND (NULL IS NULL)",
      );
    });
  });

  describe("generate where statement", () => {
    it("should generate where statement using search and filter statements", () => {
      expect(
        generateCoreWhereStatement(testDateRange, "blah", [
          "Anthrax (disorder)",
        ]),
      ).toEqual(
        "(ed.patient_name_first ILIKE '%blah%' OR ed.patient_name_last ILIKE '%blah%') AND (ed.date_created >= '2024-12-01T05:00:00.000Z' AND ed.date_created <= '2024-12-03T05:00:00.000Z') AND (ed.eICR_ID IN (SELECT DISTINCT ed_sub.eICR_ID FROM ecr_viewer.ecr_data ed_sub LEFT JOIN ecr_viewer.ecr_rr_conditions erc_sub ON ed_sub.eICR_ID = erc_sub.eICR_ID WHERE erc_sub.condition IS NOT NULL AND (erc_sub.condition ILIKE '%Anthrax (disorder)%')))",
      );
    });
    it("should generate where statement using search statement (no conditions filter provided)", () => {
      expect(
        generateCoreWhereStatement(testDateRange, "blah", undefined),
      ).toEqual(
        "(ed.patient_name_first ILIKE '%blah%' OR ed.patient_name_last ILIKE '%blah%') AND (ed.date_created >= '2024-12-01T05:00:00.000Z' AND ed.date_created <= '2024-12-03T05:00:00.000Z') AND (NULL IS NULL)",
      );
    });
    it("should generate where statement using filter conditions statement (no search provided)", () => {
      expect(
        generateCoreWhereStatement(testDateRange, "", ["Anthrax (disorder)"]),
      ).toEqual(
        "(NULL IS NULL OR NULL IS NULL) AND (ed.date_created >= '2024-12-01T05:00:00.000Z' AND ed.date_created <= '2024-12-03T05:00:00.000Z') AND (ed.eICR_ID IN (SELECT DISTINCT ed_sub.eICR_ID FROM ecr_viewer.ecr_data ed_sub LEFT JOIN ecr_viewer.ecr_rr_conditions erc_sub ON ed_sub.eICR_ID = erc_sub.eICR_ID WHERE erc_sub.condition IS NOT NULL AND (erc_sub.condition ILIKE '%Anthrax (disorder)%')))",
      );
    });
  });

  describe("generate Kysely search statement", () => {
    it('should return an OR condition for search term', () => {
      const searchCondition = generateCoreSearchStatement(
        mockExpressionBuilder,
        'John'
      );
      
      expect(searchCondition).toBeDefined();
      expect(mockExpressionBuilder.or).toHaveBeenCalled();
    });
  
    it('should return TRUE if no search term is provided', () => {
      const searchCondition = generateCoreSearchStatement(mockExpressionBuilder);
      expect(searchCondition).toBeDefined();
      expect(searchCondition).toEqual(sql`TRUE`);
    });
  });

  describe("generate Kysely filter conditions statement", () => {
    it('should generate an EXISTS subquery when conditions are provided', () => {
      const conditions = ['Condition1', 'Condition2'];
      const filterStatement = generateFilterConditionsStatement(
        mockExpressionBuilder,
        conditions
      );
  
      expect(filterStatement).toBeDefined();
      expect(mockExpressionBuilder.exists).toHaveBeenCalled();
    });
  
    it('should return TRUE if no conditions are provided', () => {
      const filterStatement = generateFilterConditionsStatement(
        mockExpressionBuilder
      );
      expect(filterStatement).toEqual(sql`TRUE`);
    });
  });

  describe("generate Kysely where statement", () => {
    it('should return a valid WHERE clause with all conditions', () => {
      const whereClause = generateCoreWhereStatement(
        mockExpressionBuilder,
        testDateRange,
        'John Doe',
        ['Condition1', 'Condition2']
      );
  
      expect(whereClause).toBeDefined();
      expect(mockExpressionBuilder.and).toHaveBeenCalled();
    });
  });
});
