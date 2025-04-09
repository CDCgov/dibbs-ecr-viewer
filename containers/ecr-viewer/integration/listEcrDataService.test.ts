/**
 * @jest-environment node
 */
import {
  ExpressionBuilder,
  AndWrapper,
  ExpressionWrapper,
  SqlBool,
} from "kysely";

import { dbDialect, dbNamespace, getDb } from "@/app/api/services/database";
import { Core, NewCoreECR } from "@/app/api/services/types/core";
import { NewExtendedECR } from "@/app/api/services/types/extended";
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

import { createEcrCondition, createEcrRule } from "./helpers/common";
import { createCoreEcr } from "./helpers/core";
import {
  buildExtended,
  dropExtended,
  clearExtended,
  buildCore,
  dropCore,
  clearCore,
} from "./helpers/ddl";
import { createExtendedEcr } from "./helpers/extended";

const testDateRange = {
  startDate: new Date("12-01-2024"),
  endDate: new Date("12-03-2024"),
};

const coreTemplate: NewCoreECR = {
  eicr_id: "12345",
  set_id: "123",
  data_source: "DB",
  fhir_reference_link: "",
  eicr_version_number: "2",
  patient_name_first: "Billy",
  patient_name_last: "Bob",
  patient_birth_date: "2024-12-01",
  date_created: new Date("2024-12-02T12:00:00Z"),
  report_date: new Date("2024-12-02T12:00:00Z"),
};

const extendedTemplate: NewExtendedECR = {
  eicr_id: "12345",
  set_id: "123",
  fhir_reference_link: "http://example.com",
  last_name: "Kenobi",
  first_name: "Obi-Wan",
  birth_date: "2024-12-31",
  gender: "Based",
  birth_sex: "Based",
  gender_identity: "Based",
  race: "Star Guy",
  ethnicity: "Star Guy",
  latitude: "0.0",
  longitude: "0.0",
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
  eicr_version_number: "2",
  authoring_date: new Date("2024-12-02T05:00:00.000Z"),
  authoring_provider: "Dr. Droid",
  provider_id: "12345",
  facility_id: "12345",
  facility_name: "Jedi Temple",
  encounter_type: "Checkup",
  encounter_start_date: new Date("2024-12-02T05:00:00.000Z"),
  encounter_end_date: new Date("2024-12-02T05:00:00.000Z"),
  reason_for_visit: "Checkup",
  active_problems: "Dead",
  date_created: new Date("2024-12-02T12:00:00Z"),
};

// prior version of ecr
const relatedEcr = {
  eicr_id: `36545`,
  eicr_version_number: "1",
  date_created: new Date("2024-12-01T11:00:00Z"),
};

const getCoreWhere = (
  ebCallBack: (
    eb: ExpressionBuilder<Core, "ecr_data">,
  ) =>
    | ExpressionWrapper<Core, "ecr_data", SqlBool>
    | AndWrapper<Core, "ecr_data", SqlBool>,
) => {
  const coredb = getDb<Core>();
  const rawRes = coredb.selectFrom("ecr_data").where(ebCallBack).compile();
  const start = `select from "${dbNamespace()}"."ecr_data" where `;
  return { sql: rawRes.sql.slice(start.length), params: rawRes.parameters };
};
// Tests rewritten to fit Kysely in following commit

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
          set_id: "123",
          eicr_version_number: "1",
          related_ecrs: [],
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
          set_id: "124",
          eicr_version_number: "1",
          related_ecrs: [],
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
          related_ecrs: [],
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
          related_ecrs: [],
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
      await createCoreEcr(coreTemplate);
      await createCoreEcr({ ...coreTemplate, ...relatedEcr });
      await createEcrCondition({
        uuid: "12345",
        eicr_id: "12345",
        condition: "Condition1",
      });
      await createEcrRule({
        uuid: "12345",
        ecr_rr_conditions_id: "12345",
        rule_summary: "Rule1",
      });
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
      expect(actual).toStrictEqual([
        {
          date_created: "12/02/2024 7:00\u00A0AM\u00A0EST",
          ecrId: "12345",
          patient_date_of_birth: "12/01/2024",
          patient_first_name: "Billy",
          patient_last_name: "Bob",
          patient_report_date:
            dbDialect() === "sqlserver"
              ? "12/01/2024 7:00\u00A0PM\u00A0EST"
              : "12/02/2024 12:00\u00A0AM\u00A0EST",
          reportable_conditions: ["Condition1"],
          rule_summaries: ["Rule1"],
          eicr_set_id: "123",
          eicr_version_number: "2",
          related_ecrs: [
            {
              ...relatedEcr,
              set_id: "123",
            },
          ],
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
      expect(actual).toStrictEqual([
        {
          date_created: "12/02/2024 7:00\u00A0AM\u00A0EST",
          ecrId: "12345",
          patient_date_of_birth: "12/01/2024",
          patient_first_name: "Billy",
          patient_last_name: "Bob",
          patient_report_date:
            dbDialect() === "sqlserver"
              ? "12/01/2024 7:00\u00A0PM\u00A0EST"
              : "12/02/2024 12:00\u00A0AM\u00A0EST",
          reportable_conditions: ["Condition1"],
          rule_summaries: ["Rule1"],
          eicr_set_id: "123",
          eicr_version_number: "2",
          related_ecrs: [{ ...relatedEcr, set_id: "123" }],
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
      await createExtendedEcr(extendedTemplate);
      await createExtendedEcr({ ...extendedTemplate, ...relatedEcr });
      await createEcrCondition({
        uuid: "12345",
        eicr_id: "12345",
        condition: "Condition1",
      });
      await createEcrRule({
        uuid: "12345",
        ecr_rr_conditions_id: "12345",
        rule_summary: "Rule1",
      });
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
      expect(result).toStrictEqual([
        {
          date_created: "12/02/2024 7:00\u00A0AM\u00A0EST",
          ecrId: "12345",
          patient_date_of_birth: "12/31/2024",
          patient_first_name: "Obi-Wan",
          patient_last_name: "Kenobi",
          patient_report_date: "12/02/2024 12:00\u00A0AM\u00A0EST",
          reportable_conditions: ["Condition1"],
          rule_summaries: ["Rule1"],
          eicr_set_id: "123",
          eicr_version_number: "2",
          related_ecrs: [
            {
              ...relatedEcr,
              set_id: "123",
            },
          ],
        },
      ]);
    });
  });

  describe("get total core ecr count", () => {
    beforeAll(async () => {
      process.env.METADATA_DATABASE_SCHEMA = "core";
      await buildCore();
      await createCoreEcr(coreTemplate);
      await createCoreEcr({ ...coreTemplate, ...relatedEcr });
    });
    afterAll(async () => {
      await dropCore();
    });

    it("should call db to get all ecrs", async () => {
      const actual = await getTotalEcrCount(testDateRange);
      expect(actual).toEqual(1);
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
      await createExtendedEcr(extendedTemplate);
      await createExtendedEcr({ ...extendedTemplate, ...relatedEcr });
    });
    afterAll(async () => {
      await dropExtended();
    });

    it("should call db to get all ecrs", async () => {
      const actual = await getTotalEcrCount(testDateRange);
      expect(actual).toEqual(1);
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
      const { sql, params } = getCoreWhere((eb) =>
        generateCoreSearchStatement(eb, "Dan"),
      );
      if (process.env.METADATA_DATABASE_TYPE === "postgres") {
        expect(sql).toEqual(
          '("test_ev_schema"."ecr_data"."patient_name_first" ilike $1 or "test_ev_schema"."ecr_data"."patient_name_last" ilike $2)',
        );
      } else if (process.env.METADATA_DATABASE_TYPE === "sqlserver") {
        expect(sql).toEqual(
          '("test_ev_schema"."ecr_data"."patient_name_first" like @1 or "test_ev_schema"."ecr_data"."patient_name_last" like @2)',
        );
      }
      expect(params).toStrictEqual(["%Dan%", "%Dan%"]);
    });
    it("should escape characters when an apostrophe is added", () => {
      const { sql, params } = getCoreWhere((eb) =>
        generateCoreSearchStatement(eb, "O'Riley"),
      );
      if (process.env.METADATA_DATABASE_TYPE === "postgres") {
        expect(sql).toEqual(
          '("test_ev_schema"."ecr_data"."patient_name_first" ilike $1 or "test_ev_schema"."ecr_data"."patient_name_last" ilike $2)',
        );
      } else if (process.env.METADATA_DATABASE_TYPE === "sqlserver") {
        expect(sql).toEqual(
          '("test_ev_schema"."ecr_data"."patient_name_first" like @1 or "test_ev_schema"."ecr_data"."patient_name_last" like @2)',
        );
      }

      expect(params).toStrictEqual(["%O'Riley%", "%O'Riley%"]);
    });
    it("should only generate true statements when no search is provided", () => {
      const { sql, params } = getCoreWhere((eb) =>
        generateCoreSearchStatement(eb, ""),
      );
      if (process.env.METADATA_DATABASE_TYPE === "postgres") {
        expect(sql).toEqual("$1 = $2");
      } else if (process.env.METADATA_DATABASE_TYPE === "sqlserver") {
        expect(sql).toEqual("@1 = @2");
      }
      expect(params).toStrictEqual([true, true]);
    });
  });

  describe("generate filter conditions statement", () => {
    it("should add conditions in the filter statement", () => {
      const { sql, params } = getCoreWhere((eb) =>
        generateFilterConditionsStatement(eb, ["Anthrax (disorder)"]),
      );
      if (process.env.METADATA_DATABASE_TYPE === "postgres") {
        expect(sql).toEqual(
          'exists (select "erc_sub"."eicr_id" from "test_ev_schema"."ecr_rr_conditions" as "erc_sub" where "erc_sub"."eicr_id" = "test_ev_schema"."ecr_data"."eicr_id" and ("erc_sub"."condition" is not null and "erc_sub"."condition" ilike $1))',
        );
      } else if (process.env.METADATA_DATABASE_TYPE === "sqlserver") {
        expect(sql).toEqual(
          'exists (select "erc_sub"."eicr_id" from "test_ev_schema"."ecr_rr_conditions" as "erc_sub" where "erc_sub"."eicr_id" = "test_ev_schema"."ecr_data"."eicr_id" and ("erc_sub"."condition" is not null and "erc_sub"."condition" like @1))',
        );
      }
      expect(params).toStrictEqual(["%Anthrax (disorder)%"]);
    });
    it("should only look for eCRs with no conditions when de-selecting all conditions on filter", () => {
      const { sql, params } = getCoreWhere((eb) =>
        generateFilterConditionsStatement(eb, [""]),
      );
      if (process.env.METADATA_DATABASE_TYPE === "postgres") {
        expect(sql).toEqual(
          '"test_ev_schema"."ecr_data"."eicr_id" not in (select "erc_sub"."eicr_id" from "test_ev_schema"."ecr_rr_conditions" as "erc_sub" where "erc_sub"."condition" is not null)',
        );
      } else if (process.env.METADATA_DATABASE_TYPE === "sqlserver") {
        expect(sql).toEqual(
          '"test_ev_schema"."ecr_data"."eicr_id" not in (select "erc_sub"."eicr_id" from "test_ev_schema"."ecr_rr_conditions" as "erc_sub" where "erc_sub"."condition" is not null)',
        );
      }

      expect(params).toStrictEqual([]);
    });
    it("should add date range in the filter statement", () => {
      const { sql, params } = getCoreWhere((eb) =>
        generateFilterDateStatement(eb, testDateRange),
      );
      if (process.env.METADATA_DATABASE_TYPE === "postgres") {
        expect(sql).toEqual(
          '("test_ev_schema"."ecr_data"."date_created" >= $1 and "test_ev_schema"."ecr_data"."date_created" <= $2)',
        );
      } else if (process.env.METADATA_DATABASE_TYPE === "sqlserver") {
        expect(sql).toEqual(
          '("test_ev_schema"."ecr_data"."date_created" >= @1 and "test_ev_schema"."ecr_data"."date_created" <= @2)',
        );
      }

      expect(params).toStrictEqual([
        testDateRange.startDate,
        testDateRange.endDate,
      ]);
    });
    it("should display all conditions in date range by default if no filter has been added", () => {
      const { sql, params } = getCoreWhere((eb) =>
        generateCoreWhereStatement(eb, testDateRange, "", undefined),
      );
      if (process.env.METADATA_DATABASE_TYPE === "postgres") {
        expect(sql).toEqual(
          '($1 = $2 and ("test_ev_schema"."ecr_data"."date_created" >= $3 and "test_ev_schema"."ecr_data"."date_created" <= $4) and $5 = $6)',
        );
      } else if (process.env.METADATA_DATABASE_TYPE === "sqlserver") {
        expect(sql).toEqual(
          '(@1 = @2 and ("test_ev_schema"."ecr_data"."date_created" >= @3 and "test_ev_schema"."ecr_data"."date_created" <= @4) and @5 = @6)',
        );
      }

      expect(params).toStrictEqual([
        true,
        true,
        testDateRange.startDate,
        testDateRange.endDate,
        true,
        true,
      ]);
    });
  });

  describe("generate where statement", () => {
    it("should generate where statement using search and filter statements", () => {
      const { sql, params } = getCoreWhere((eb) =>
        generateCoreWhereStatement(eb, testDateRange, "blah", [
          "Anthrax (disorder)",
        ]),
      );
      if (process.env.METADATA_DATABASE_TYPE === "postgres") {
        expect(sql).toEqual(
          '(("test_ev_schema"."ecr_data"."patient_name_first" ilike $1 or "test_ev_schema"."ecr_data"."patient_name_last" ilike $2) and ("test_ev_schema"."ecr_data"."date_created" >= $3 and "test_ev_schema"."ecr_data"."date_created" <= $4) and exists (select "erc_sub"."eicr_id" from "test_ev_schema"."ecr_rr_conditions" as "erc_sub" where "erc_sub"."eicr_id" = "test_ev_schema"."ecr_data"."eicr_id" and ("erc_sub"."condition" is not null and "erc_sub"."condition" ilike $5)))',
        );
      } else if (process.env.METADATA_DATABASE_TYPE === "sqlserver") {
        expect(sql).toEqual(
          '(("test_ev_schema"."ecr_data"."patient_name_first" like @1 or "test_ev_schema"."ecr_data"."patient_name_last" like @2) and ("test_ev_schema"."ecr_data"."date_created" >= @3 and "test_ev_schema"."ecr_data"."date_created" <= @4) and exists (select "erc_sub"."eicr_id" from "test_ev_schema"."ecr_rr_conditions" as "erc_sub" where "erc_sub"."eicr_id" = "test_ev_schema"."ecr_data"."eicr_id" and ("erc_sub"."condition" is not null and "erc_sub"."condition" like @5)))',
        );
      }

      expect(params).toStrictEqual([
        "%blah%",
        "%blah%",
        testDateRange.startDate,
        testDateRange.endDate,
        "%Anthrax (disorder)%",
      ]);
    });
    it("should generate where statement using search statement (no conditions filter provided)", () => {
      const { sql, params } = getCoreWhere((eb) =>
        generateCoreWhereStatement(eb, testDateRange, "blah", undefined),
      );
      if (process.env.METADATA_DATABASE_TYPE === "postgres") {
        expect(sql).toEqual(
          '(("test_ev_schema"."ecr_data"."patient_name_first" ilike $1 or "test_ev_schema"."ecr_data"."patient_name_last" ilike $2) and ("test_ev_schema"."ecr_data"."date_created" >= $3 and "test_ev_schema"."ecr_data"."date_created" <= $4) and $5 = $6)',
        );
      } else if (process.env.METADATA_DATABASE_TYPE === "sqlserver") {
        expect(sql).toEqual(
          '(("test_ev_schema"."ecr_data"."patient_name_first" like @1 or "test_ev_schema"."ecr_data"."patient_name_last" like @2) and ("test_ev_schema"."ecr_data"."date_created" >= @3 and "test_ev_schema"."ecr_data"."date_created" <= @4) and @5 = @6)',
        );
      }

      expect(params).toStrictEqual([
        "%blah%",
        "%blah%",
        testDateRange.startDate,
        testDateRange.endDate,
        true,
        true,
      ]);
    });
    it("should generate where statement using filter conditions statement (no search provided)", () => {
      const { sql, params } = getCoreWhere((eb) =>
        generateCoreWhereStatement(eb, testDateRange, "", [
          "Anthrax (disorder)",
        ]),
      );
      if (process.env.METADATA_DATABASE_TYPE === "postgres") {
        expect(sql).toEqual(
          '($1 = $2 and ("test_ev_schema"."ecr_data"."date_created" >= $3 and "test_ev_schema"."ecr_data"."date_created" <= $4) and exists (select "erc_sub"."eicr_id" from "test_ev_schema"."ecr_rr_conditions" as "erc_sub" where "erc_sub"."eicr_id" = "test_ev_schema"."ecr_data"."eicr_id" and ("erc_sub"."condition" is not null and "erc_sub"."condition" ilike $5)))',
        );
      } else if (process.env.METADATA_DATABASE_TYPE === "sqlserver") {
        expect(sql).toEqual(
          '(@1 = @2 and ("test_ev_schema"."ecr_data"."date_created" >= @3 and "test_ev_schema"."ecr_data"."date_created" <= @4) and exists (select "erc_sub"."eicr_id" from "test_ev_schema"."ecr_rr_conditions" as "erc_sub" where "erc_sub"."eicr_id" = "test_ev_schema"."ecr_data"."eicr_id" and ("erc_sub"."condition" is not null and "erc_sub"."condition" like @5)))',
        );
      }

      expect(params).toStrictEqual([
        true,
        true,
        testDateRange.startDate,
        testDateRange.endDate,
        "%Anthrax (disorder)%",
      ]);
    });
  });

  describe("generate Kysely search statement", () => {
    it("should return an OR condition for search term", () => {
      const { sql, params } = getCoreWhere((eb) =>
        generateCoreSearchStatement(eb, "John"),
      );

      if (process.env.METADATA_DATABASE_TYPE === "postgres") {
        expect(sql).toEqual(
          '("test_ev_schema"."ecr_data"."patient_name_first" ilike $1 or "test_ev_schema"."ecr_data"."patient_name_last" ilike $2)',
        );
      } else if (process.env.METADATA_DATABASE_TYPE === "sqlserver") {
        expect(sql).toEqual(
          '("test_ev_schema"."ecr_data"."patient_name_first" like @1 or "test_ev_schema"."ecr_data"."patient_name_last" like @2)',
        );
      }
      expect(params).toStrictEqual(["%John%", "%John%"]);
    });

    it("should return TRUE if no search term is provided", () => {
      const { sql, params } = getCoreWhere((eb) =>
        generateCoreSearchStatement(eb),
      );
      if (process.env.METADATA_DATABASE_TYPE === "postgres") {
        expect(sql).toEqual("$1 = $2");
      } else if (process.env.METADATA_DATABASE_TYPE === "sqlserver") {
        expect(sql).toEqual("@1 = @2");
      }
      expect(params).toStrictEqual([true, true]);
    });
  });

  describe("generate Kysely filter conditions statement", () => {
    it("should generate an EXISTS subquery when conditions are provided", () => {
      const conditions = ["Condition1", "Condition2"];
      const { sql, params } = getCoreWhere((eb) =>
        generateFilterConditionsStatement(eb, conditions),
      );

      if (process.env.METADATA_DATABASE_TYPE === "postgres") {
        expect(sql).toEqual(
          'exists (select "erc_sub"."eicr_id" from "test_ev_schema"."ecr_rr_conditions" as "erc_sub" where "erc_sub"."eicr_id" = "test_ev_schema"."ecr_data"."eicr_id" and ("erc_sub"."condition" is not null and ("erc_sub"."condition" ilike $1 or "erc_sub"."condition" ilike $2)))',
        );
      } else if (process.env.METADATA_DATABASE_TYPE === "sqlserver") {
        expect(sql).toEqual(
          'exists (select "erc_sub"."eicr_id" from "test_ev_schema"."ecr_rr_conditions" as "erc_sub" where "erc_sub"."eicr_id" = "test_ev_schema"."ecr_data"."eicr_id" and ("erc_sub"."condition" is not null and ("erc_sub"."condition" like @1 or "erc_sub"."condition" like @2)))',
        );
      }
      expect(params).toStrictEqual(["%Condition1%", "%Condition2%"]);
    });

    it("should return TRUE if no conditions are provided", () => {
      const { sql, params } = getCoreWhere((eb) =>
        generateFilterConditionsStatement(eb),
      );
      if (process.env.METADATA_DATABASE_TYPE === "postgres") {
        expect(sql).toEqual("$1 = $2");
      } else if (process.env.METADATA_DATABASE_TYPE === "sqlserver") {
        expect(sql).toEqual("@1 = @2");
      }
      expect(params).toStrictEqual([true, true]);
    });
  });

  describe("generate Kysely where statement", () => {
    it("should return a valid WHERE clause with all conditions", () => {
      const { sql, params } = getCoreWhere((eb) =>
        generateCoreWhereStatement(eb, testDateRange, "John Doe", [
          "Condition1",
          "Condition2",
        ]),
      );

      if (process.env.METADATA_DATABASE_TYPE === "postgres") {
        expect(sql).toEqual(
          '(("test_ev_schema"."ecr_data"."patient_name_first" ilike $1 or "test_ev_schema"."ecr_data"."patient_name_last" ilike $2) and ("test_ev_schema"."ecr_data"."date_created" >= $3 and "test_ev_schema"."ecr_data"."date_created" <= $4) and exists (select "erc_sub"."eicr_id" from "test_ev_schema"."ecr_rr_conditions" as "erc_sub" where "erc_sub"."eicr_id" = "test_ev_schema"."ecr_data"."eicr_id" and ("erc_sub"."condition" is not null and ("erc_sub"."condition" ilike $5 or "erc_sub"."condition" ilike $6))))',
        );
      } else if (process.env.METADATA_DATABASE_TYPE === "sqlserver") {
        expect(sql).toEqual(
          '(("test_ev_schema"."ecr_data"."patient_name_first" like @1 or "test_ev_schema"."ecr_data"."patient_name_last" like @2) and ("test_ev_schema"."ecr_data"."date_created" >= @3 and "test_ev_schema"."ecr_data"."date_created" <= @4) and exists (select "erc_sub"."eicr_id" from "test_ev_schema"."ecr_rr_conditions" as "erc_sub" where "erc_sub"."eicr_id" = "test_ev_schema"."ecr_data"."eicr_id" and ("erc_sub"."condition" is not null and ("erc_sub"."condition" like @5 or "erc_sub"."condition" like @6))))',
        );
      }
      expect(params).toStrictEqual([
        "%John Doe%",
        "%John Doe%",
        testDateRange.startDate,
        testDateRange.endDate,
        "%Condition1%",
        "%Condition2%",
      ]);
    });
  });
});
