/**
 * @jest-environment node
 */
import {
  CoreMetadataModel,
  EcrDisplay,
  generateFilterConditionsStatement,
  generateSearchStatement,
  generateWhereStatementPostgres,
  getTotalEcrCount,
  processCoreMetadata,
  listEcrData,
  generateFilterDateStatementPostgres,
} from "../services/listEcrDataService";
import { getDB } from "../api/services/postgres_db";
import { formatDate, formatDateTime } from "../services/formatService";
import { get_pool } from "../api/services/sqlserver_db";

jest.mock("../api/services/sqlserver_db", () => ({
  get_pool: jest.fn(),
}));

const { database } = getDB();

const testDateRange = {
  startDate: new Date("12-01-2024"),
  endDate: new Date("12-02-2024"),
};

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
        },
      ];
      const result = processCoreMetadata(responseBody);

      expect(result).toEqual(expected);
    });
  });

  describe("list Ecr data with postgres", () => {
    beforeAll(() => {
      process.env.METADATA_DATABASE_TYPE = "postgres";
    });
    afterAll(() => {
      delete process.env.METADATA_DATABASE_TYPE;
    });
    it("should return empty array when no data is found", async () => {
      let startIndex = 0;
      let itemsPerPage = 25;
      let columnName = "date_created";
      let direction = "DESC";

      database.manyOrNone = jest.fn(() => Promise.resolve([]));
      const actual = await listEcrData(
        startIndex,
        itemsPerPage,
        columnName,
        direction,
        testDateRange,
      );
      expect(database.manyOrNone).toHaveBeenCalledOnce();
      expect(database.manyOrNone).toHaveBeenCalledWith(
        "SELECT ed.eICR_ID, ed.patient_name_first, ed.patient_name_last, ed.patient_birth_date, ed.date_created, ed.report_date, ed.report_date,  ARRAY_AGG(DISTINCT erc.condition) AS conditions, ARRAY_AGG(DISTINCT ers.rule_summary) AS rule_summaries FROM ecr_data ed LEFT JOIN ecr_rr_conditions erc ON ed.eICR_ID = erc.eICR_ID LEFT JOIN ecr_rr_rule_summaries ers ON erc.uuid = ers.ecr_rr_conditions_id WHERE $[whereClause] GROUP BY ed.eICR_ID, ed.patient_name_first, ed.patient_name_last, ed.patient_birth_date, ed.date_created, ed.report_date $[sortStatement] OFFSET $[startIndex] ROWS FETCH NEXT $[itemsPerPage] ROWS ONLY",
        {
          whereClause: expect.any(Object),
          startIndex,
          itemsPerPage,
          sortStatement: expect.any(Object),
        },
      );
      expect(actual).toBeEmpty();
    });

    it("should return data when found", async () => {
      database.manyOrNone<CoreMetadataModel> = jest.fn(() =>
        Promise.resolve<CoreMetadataModel[]>([
          {
            eicr_id: "1234",
            date_created: new Date("2024-06-21T12:00:00Z"),
            patient_birth_date: new Date("11/07/1954"),
            patient_name_first: "Billy",
            patient_name_last: "Bob",
            report_date: new Date("06/21/2024 8:00 AM EDT"),
            conditions: ["super ebola", "double ebola"],
            rule_summaries: ["watch out for super ebola"],
            data_link: "",
            data_source: "DB",
          },
        ]),
      );

      let startIndex = 0;
      let itemsPerPage = 25;
      let columnName = "date_created";
      let direction = "DESC";
      const actual: EcrDisplay[] = await listEcrData(
        startIndex,
        itemsPerPage,
        columnName,
        direction,
        testDateRange,
      );

      expect(database.manyOrNone).toHaveBeenCalledOnce();
      expect(database.manyOrNone).toHaveBeenCalledWith(
        "SELECT ed.eICR_ID, ed.patient_name_first, ed.patient_name_last, ed.patient_birth_date, ed.date_created, ed.report_date, ed.report_date,  ARRAY_AGG(DISTINCT erc.condition) AS conditions, ARRAY_AGG(DISTINCT ers.rule_summary) AS rule_summaries FROM ecr_data ed LEFT JOIN ecr_rr_conditions erc ON ed.eICR_ID = erc.eICR_ID LEFT JOIN ecr_rr_rule_summaries ers ON erc.uuid = ers.ecr_rr_conditions_id WHERE $[whereClause] GROUP BY ed.eICR_ID, ed.patient_name_first, ed.patient_name_last, ed.patient_birth_date, ed.date_created, ed.report_date $[sortStatement] OFFSET $[startIndex] ROWS FETCH NEXT $[itemsPerPage] ROWS ONLY",
        {
          whereClause: expect.any(Object),
          startIndex,
          itemsPerPage,
          sortStatement: expect.any(Object),
        },
      );
      expect(actual).toEqual([
        {
          date_created: "06/21/2024 8:00\u00A0AM\u00A0EDT",
          ecrId: "1234",
          patient_date_of_birth: "11/07/1954",
          patient_first_name: "Billy",
          patient_last_name: "Bob",
          patient_report_date: "06/21/2024 8:00\u00A0AM\u00A0EDT",
          reportable_conditions: ["super ebola", "double ebola"],
          rule_summaries: ["watch out for super ebola"],
        },
      ]);
    });

    it("should get data from the fhir_metadata table", async () => {
      database.manyOrNone<CoreMetadataModel> = jest.fn(() =>
        Promise.resolve<CoreMetadataModel[]>([
          {
            eicr_id: "1234",
            date_created: new Date("2024-06-21T12:00:00Z"),
            patient_name_first: "boy",
            patient_name_last: "lnam",
            patient_birth_date: new Date("1990-01-01T05:00:00.000Z"),
            report_date: new Date("2024-06-20T04:00:00.000Z"),
            conditions: ["sick", "tired"],
            rule_summaries: ["stuff", "disease discovered"],
            data_link: "",
            data_source: "DB",
          },
        ]),
      );

      let startIndex = 0;
      let itemsPerPage = 25;
      let columnName = "date_created";
      let direction = "DESC";
      const actual: EcrDisplay[] = await listEcrData(
        startIndex,
        itemsPerPage,
        columnName,
        direction,
        testDateRange,
      );
      expect(database.manyOrNone).toHaveBeenCalledOnce();
      expect(database.manyOrNone).toHaveBeenCalledWith(
        "SELECT ed.eICR_ID, ed.patient_name_first, ed.patient_name_last, ed.patient_birth_date, ed.date_created, ed.report_date, ed.report_date,  ARRAY_AGG(DISTINCT erc.condition) AS conditions, ARRAY_AGG(DISTINCT ers.rule_summary) AS rule_summaries FROM ecr_data ed LEFT JOIN ecr_rr_conditions erc ON ed.eICR_ID = erc.eICR_ID LEFT JOIN ecr_rr_rule_summaries ers ON erc.uuid = ers.ecr_rr_conditions_id WHERE $[whereClause] GROUP BY ed.eICR_ID, ed.patient_name_first, ed.patient_name_last, ed.patient_birth_date, ed.date_created, ed.report_date $[sortStatement] OFFSET $[startIndex] ROWS FETCH NEXT $[itemsPerPage] ROWS ONLY",
        {
          whereClause: expect.any(Object),
          startIndex,
          itemsPerPage,
          sortStatement: expect.any(Object),
        },
      );
      expect(actual).toEqual([
        {
          date_created: "06/21/2024 8:00\u00A0AM\u00A0EDT",
          ecrId: "1234",
          patient_date_of_birth: "01/01/1990",
          patient_first_name: "boy",
          patient_last_name: "lnam",
          patient_report_date: "06/20/2024 12:00\u00A0AM\u00A0EDT",
          reportable_conditions: ["sick", "tired"],
          rule_summaries: ["stuff", "disease discovered"],
        },
      ]);
    });

    it("should filter base on search term", async () => {
      database.manyOrNone = jest.fn(() => Promise.resolve([]));
      let startIndex = 0;
      let itemsPerPage = 25;
      let columnName = "date_created";
      let direction = "DESC";
      let searchTerm = "abc";

      await listEcrData(
        startIndex,
        itemsPerPage,
        columnName,
        direction,
        testDateRange,
        searchTerm,
      );
      expect(database.manyOrNone).toHaveBeenCalledOnce();
      expect(database.manyOrNone).toHaveBeenCalledWith(
        "SELECT ed.eICR_ID, ed.patient_name_first, ed.patient_name_last, ed.patient_birth_date, ed.date_created, ed.report_date, ed.report_date,  ARRAY_AGG(DISTINCT erc.condition) AS conditions, ARRAY_AGG(DISTINCT ers.rule_summary) AS rule_summaries FROM ecr_data ed LEFT JOIN ecr_rr_conditions erc ON ed.eICR_ID = erc.eICR_ID LEFT JOIN ecr_rr_rule_summaries ers ON erc.uuid = ers.ecr_rr_conditions_id WHERE $[whereClause] GROUP BY ed.eICR_ID, ed.patient_name_first, ed.patient_name_last, ed.patient_birth_date, ed.date_created, ed.report_date $[sortStatement] OFFSET $[startIndex] ROWS FETCH NEXT $[itemsPerPage] ROWS ONLY",
        {
          whereClause: expect.any(Object),
          startIndex,
          itemsPerPage,
          sortStatement: expect.any(Object),
        },
      );
    });

    it("should escape search term", async () => {
      database.manyOrNone = jest.fn(() => Promise.resolve([]));
      let startIndex = 0;
      let itemsPerPage = 25;
      let searchTerm = "O'Riley";
      let columnName = "date_created";
      let direction = "DESC";

      await listEcrData(
        startIndex,
        itemsPerPage,
        columnName,
        direction,
        testDateRange,
        searchTerm,
      );
      expect(database.manyOrNone).toHaveBeenCalledOnce();
      expect(database.manyOrNone).toHaveBeenCalledWith(
        "SELECT ed.eICR_ID, ed.patient_name_first, ed.patient_name_last, ed.patient_birth_date, ed.date_created, ed.report_date, ed.report_date,  ARRAY_AGG(DISTINCT erc.condition) AS conditions, ARRAY_AGG(DISTINCT ers.rule_summary) AS rule_summaries FROM ecr_data ed LEFT JOIN ecr_rr_conditions erc ON ed.eICR_ID = erc.eICR_ID LEFT JOIN ecr_rr_rule_summaries ers ON erc.uuid = ers.ecr_rr_conditions_id WHERE $[whereClause] GROUP BY ed.eICR_ID, ed.patient_name_first, ed.patient_name_last, ed.patient_birth_date, ed.date_created, ed.report_date $[sortStatement] OFFSET $[startIndex] ROWS FETCH NEXT $[itemsPerPage] ROWS ONLY",
        {
          whereClause: expect.any(Object),
          startIndex,
          itemsPerPage,
          sortStatement: expect.any(Object),
        },
      );
    });
  });

  describe("listEcrDataService with SQL Server", () => {
    beforeEach(() => {
      jest.resetModules();
      jest.clearAllMocks();
      process.env.METADATA_DATABASE_TYPE = "sqlserver";
    });
    afterAll(() => {
      jest.resetModules();
      jest.clearAllMocks();
      process.env.METADATA_DATABASE_TYPE = "postgres";
    });

    describe("listEcrData with SQL Server", () => {
      it("should return data when DATABASE_TYPE is sqlserver", async () => {
        // Arrange
        const mockRecordset = [
          {
            eICR_ID: "123",
            first_name: "John",
            last_name: "Doe",
            birth_date: new Date("1990-01-01"),
            encounter_start_date: new Date("2023-01-01T07:30:00Z"),
            date_created: new Date("2023-01-02T07:45:00Z"),
            conditions: "Condition1,Condition2",
            rule_summaries: "Rule1,Rule2",
          },
          {
            eICR_ID: "124",
            first_name: "Jane",
            last_name: "Doe",
            birth_date: new Date("1990-01-02"),
            encounter_start_date: new Date("2023-01-02T07:30:00Z"),
            date_created: new Date("2023-01-01T07:45:00Z"),
            conditions: "Condition1,Condition2",
            rule_summaries: "Rule1,Rule2",
          },
        ];

        const mockQuery = jest
          .fn()
          .mockResolvedValue({ recordset: mockRecordset });
        const mockRequest = {
          query: mockQuery,
        };
        const mockPool = {
          request: jest.fn().mockReturnValue(mockRequest),
          close: jest.fn(),
        };

        // Mock get_pool to return mockPool
        (get_pool as jest.Mock).mockResolvedValue(mockPool);

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
            ecrId: "123",
            patient_first_name: "John",
            patient_last_name: "Doe",
            patient_date_of_birth: "01/01/1990",
            reportable_conditions: ["Condition1", "Condition2"],
            rule_summaries: ["Rule1", "Rule2"],
            date_created: "01/02/2023 2:45\u00A0AM\u00A0EST",
            patient_report_date: "01/01/2023 2:30\u00A0AM\u00A0EST",
          },
          {
            ecrId: "124",
            patient_first_name: "Jane",
            patient_last_name: "Doe",
            patient_date_of_birth: "01/02/1990",
            patient_report_date: "01/02/2023 2:30\u00A0AM\u00A0EST",
            date_created: "01/01/2023 2:45\u00A0AM\u00A0EST",
            reportable_conditions: ["Condition1", "Condition2"],
            rule_summaries: ["Rule1", "Rule2"],
          },
        ]);

        expect(get_pool).toHaveBeenCalled();
        expect(mockPool.request).toHaveBeenCalled();
        expect(mockQuery).toHaveBeenCalled();
      });
    });

    describe("getTotalEcrCount with SQL Server", () => {
      it("should return count when DATABASE_TYPE is sqlserver", async () => {
        // Arrange
        const mockRecordset = [{ count: 42 }];
        const mockQuery = jest
          .fn()
          .mockResolvedValue({ recordset: mockRecordset });
        const mockRequest = {
          query: mockQuery,
        };
        const mockPool = {
          request: jest.fn().mockReturnValue(mockRequest),
          close: jest.fn(),
        };

        (get_pool as jest.Mock).mockResolvedValue(mockPool);

        // Act
        const count = await getTotalEcrCount(testDateRange);

        // Assert
        expect(count).toEqual(42);
        expect(get_pool).toHaveBeenCalled();
        expect(mockPool.request).toHaveBeenCalled();
        expect(mockQuery).toHaveBeenCalled();
      });
    });
  });

  describe("get total ecr count", () => {
    it("should call db to get all ecrs", async () => {
      database.one<{ count: number }> = jest.fn(() =>
        Promise.resolve({ count: 0 }),
      );
      await getTotalEcrCount(testDateRange);
      expect(database.one).toHaveBeenCalledOnce();
      expect(database.one).toHaveBeenCalledWith(
        "SELECT count(DISTINCT ed.eICR_ID) FROM ecr_data as ed LEFT JOIN ecr_rr_conditions erc on ed.eICR_ID = erc.eICR_ID WHERE $[whereClause]",
        { whereClause: expect.any(Object) },
      );
    });
    it("should use search term in count query", async () => {
      database.one<{ count: number }> = jest.fn(() =>
        Promise.resolve({ count: 0 }),
      );
      await getTotalEcrCount(testDateRange, "blah", undefined);
      expect(database.one).toHaveBeenCalledOnce();
      expect(database.one).toHaveBeenCalledWith(
        "SELECT count(DISTINCT ed.eICR_ID) FROM ecr_data as ed LEFT JOIN ecr_rr_conditions erc on ed.eICR_ID = erc.eICR_ID WHERE $[whereClause]",
        {
          whereClause: expect.any(Object),
        },
      );
    });
    it("should escape the search term in count query", async () => {
      database.one<{ count: number }> = jest.fn(() =>
        Promise.resolve({ count: 0 }),
      );
      await getTotalEcrCount(testDateRange, "O'Riley", undefined);
      expect(database.one).toHaveBeenCalledOnce();
      expect(database.one).toHaveBeenCalledWith(
        "SELECT count(DISTINCT ed.eICR_ID) FROM ecr_data as ed LEFT JOIN ecr_rr_conditions erc on ed.eICR_ID = erc.eICR_ID WHERE $[whereClause]",
        {
          whereClause: expect.any(Object),
        },
      );
    });
    it("should use filter conditions in count query", async () => {
      database.one<{ count: number }> = jest.fn(() =>
        Promise.resolve({ count: 0 }),
      );
      await getTotalEcrCount(testDateRange, "", ["Anthrax (disorder)"]);
      expect(database.one).toHaveBeenCalledOnce();

      expect(database.one).toHaveBeenCalledWith(
        "SELECT count(DISTINCT ed.eICR_ID) FROM ecr_data as ed LEFT JOIN ecr_rr_conditions erc on ed.eICR_ID = erc.eICR_ID WHERE $[whereClause]",
        {
          whereClause: expect.any(Object),
        },
      );
    });
  });

  describe("generate search statement", () => {
    it("should use the search term in the search statement", () => {
      expect(generateSearchStatement("Dan").toPostgres()).toEqual(
        "ed.patient_name_first ILIKE '%Dan%' OR ed.patient_name_last ILIKE '%Dan%'",
      );
    });
    it("should escape characters when an apostrophe is added", () => {
      expect(generateSearchStatement("O'Riley").toPostgres()).toEqual(
        "ed.patient_name_first ILIKE '%O''Riley%' OR ed.patient_name_last ILIKE '%O''Riley%'",
      );
    });
    it("should only generate true statements when no search is provided", () => {
      expect(generateSearchStatement("").toPostgres()).toEqual(
        "NULL IS NULL OR NULL IS NULL",
      );
    });
  });

  describe("generate filter conditions statement", () => {
    it("should add conditions in the filter statement", () => {
      expect(
        generateFilterConditionsStatement(["Anthrax (disorder)"]).toPostgres(),
      ).toEqual(
        "ed.eICR_ID IN (SELECT DISTINCT ed_sub.eICR_ID FROM ecr_data ed_sub LEFT JOIN ecr_rr_conditions erc_sub ON ed_sub.eICR_ID = erc_sub.eICR_ID WHERE erc_sub.condition IS NOT NULL AND (erc_sub.condition ILIKE '%Anthrax (disorder)%'))",
      );
    });
    it("should only look for eCRs with no conditions when de-selecting all conditions on filter", () => {
      expect(generateFilterConditionsStatement([""]).toPostgres()).toEqual(
        "ed.eICR_ID NOT IN (SELECT DISTINCT erc_sub.eICR_ID FROM ecr_rr_conditions erc_sub WHERE erc_sub.condition IS NOT NULL)",
      );
    });
    it("should add date range in the filter statement", () => {
      expect(
        generateFilterDateStatementPostgres(testDateRange).toPostgres(),
      ).toEqual(
        "ed.date_created >= '2024-12-01T00:00:00.000-05:00' AND ed.date_created <= '2024-12-02T00:00:00.000-05:00'",
      );
    });
    it("should display all conditions in date range by default if no filter has been added", () => {
      expect(
        generateWhereStatementPostgres(
          testDateRange,
          "",
          undefined,
        ).toPostgres(),
      ).toEqual(
        "(NULL IS NULL OR NULL IS NULL) AND (ed.date_created >= '2024-12-01T00:00:00.000-05:00' AND ed.date_created <= '2024-12-02T00:00:00.000-05:00') AND (NULL IS NULL)",
      );
    });
  });

  describe("generate where statement", () => {
    it("should generate where statement using search and filter statements", () => {
      expect(
        generateWhereStatementPostgres(testDateRange, "blah", [
          "Anthrax (disorder)",
        ]).toPostgres(),
      ).toEqual(
        "(ed.patient_name_first ILIKE '%blah%' OR ed.patient_name_last ILIKE '%blah%') AND (ed.date_created >= '2024-12-01T00:00:00.000-05:00' AND ed.date_created <= '2024-12-02T00:00:00.000-05:00') AND (ed.eICR_ID IN (SELECT DISTINCT ed_sub.eICR_ID FROM ecr_data ed_sub LEFT JOIN ecr_rr_conditions erc_sub ON ed_sub.eICR_ID = erc_sub.eICR_ID WHERE erc_sub.condition IS NOT NULL AND (erc_sub.condition ILIKE '%Anthrax (disorder)%')))",
      );
    });
    it("should generate where statement using search statement (no conditions filter provided)", () => {
      expect(
        generateWhereStatementPostgres(
          testDateRange,
          "blah",
          undefined,
        ).toPostgres(),
      ).toEqual(
        "(ed.patient_name_first ILIKE '%blah%' OR ed.patient_name_last ILIKE '%blah%') AND (ed.date_created >= '2024-12-01T00:00:00.000-05:00' AND ed.date_created <= '2024-12-02T00:00:00.000-05:00') AND (NULL IS NULL)",
      );
    });
    it("should generate where statement using filter conditions statement (no search provided)", () => {
      expect(
        generateWhereStatementPostgres(testDateRange, "", [
          "Anthrax (disorder)",
        ]).toPostgres(),
      ).toEqual(
        "(NULL IS NULL OR NULL IS NULL) AND (ed.date_created >= '2024-12-01T00:00:00.000-05:00' AND ed.date_created <= '2024-12-02T00:00:00.000-05:00') AND (ed.eICR_ID IN (SELECT DISTINCT ed_sub.eICR_ID FROM ecr_data ed_sub LEFT JOIN ecr_rr_conditions erc_sub ON ed_sub.eICR_ID = erc_sub.eICR_ID WHERE erc_sub.condition IS NOT NULL AND (erc_sub.condition ILIKE '%Anthrax (disorder)%')))",
      );
    });
  });
});
