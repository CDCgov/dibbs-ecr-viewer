/**
 * @jest-environment node
 */
import {
  ExpressionBuilder,
  AndWrapper,
  ExpressionWrapper,
  SqlBool,
} from "kysely";

import {
  createCoreEcr,
  createEcrCondition,
  createEcrRule,
  getLastAuditLog,
} from "../helpers/core";
import { buildCore, dropExisting, clearEcrCore } from "../helpers/ddl";
import { seedUserProgramData } from "../helpers/seed";
import { getDb } from "@/app/data/metadataDb/database";
import { Core, NewCoreECR } from "@/app/data/metadataDb/types/core";
import { dbNamespace } from "@/app/data/metadataDb/utils/db-config";
import { formatDate, formatDateTime } from "@/app/services/formatDateService";
import {
  MetadataModel,
  generateFilterConditionsStatement,
  generateSearchStatement,
  generateWhereStatement,
  getTotalEcrCount,
  processMetadata,
  listEcrData,
  generateFilterDateStatement,
} from "@/app/services/listEcrDataService";
import { EcrDisplay } from "@/app/types";
import { getLoggedInUserSession } from "@/app/utils/auth-utils";

const filterDates = {
  startDate: new Date("12-01-2024"),
  endDate: new Date("12-03-2024"),
};

const coreTemplate: NewCoreECR = {
  eicr_id: "12345",
  set_id: "123",
  fhir_reference_link: "",
  eicr_version_number: "2",
  first_name: "Billy",
  last_name: "Bob",
  birth_date: "2024-12-01",
  date_created: new Date("2024-12-02T12:00:00Z"),
  encounter_start_date: new Date("2024-12-02T12:00:00Z"),
};

// prior version of ecr
const relatedEcr = {
  eicr_id: `36545`,
  eicr_version_number: "1",
  date_created: new Date("2024-12-01T11:00:00Z"),
};

const mockAdmin = {
    uuid: "123",
    email: "admin@admin.com",
    name: "Adam Admin",
    date_of_last_login: new Date("2025-04-15T10:30:00Z"),
    user_type: "admin",
    status: "Active",
    date_created: new Date("2025-01-01T09:00:00Z"),
    author_uuid: "123",
    program_areas: [],
  };

  const mockStandardUser = {
    uuid: "234",
    email: "sallystandard@standard.com",
    name: "Sally Standard",
    date_of_last_login: new Date("2025-04-15T10:30:00Z"),
    user_type: "standard",
    status: "Active",
    date_created: new Date("2025-01-01T09:00:00Z"),
    author_uuid: "123",
    program_areas: [
      {
        program_area_uuid: "456",
        user_uuid: "234",
        name: "Program Area Two",
      },
      {
        program_area_uuid: "789",
        user_uuid: "234",
        name: "Program Area Three",
      },
    ],
  }

const getWhere = (
  ebCallBack: (
    eb: ExpressionBuilder<Core, "ecr_data">,
  ) =>
    | ExpressionWrapper<Core, "ecr_data", SqlBool>
    | AndWrapper<Core, "ecr_data", SqlBool>,
) => {
  const coreDb = getDb<Core>();
  const rawRes = coreDb.selectFrom("ecr_data").where(ebCallBack).compile();
  const start = `select from "${dbNamespace()}"."ecr_data" where `;
  return { sql: rawRes.sql.slice(start.length), params: rawRes.parameters };
};

jest.mock("@/app/utils/auth-utils");

// TODO
beforeEach(() => {
  (getLoggedInUserSession as jest.Mock).mockResolvedValue({
    name: "Adam Admin",
    email: "admin@admin.com",
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

beforeAll(async () => {
  (getLoggedInUserSession as jest.Mock).mockResolvedValue({
    name: "Adam Admin",
    email: "admin@admin.com",
  });
  await buildCore();
  await seedUserProgramData();
});

afterAll(async () => {
  await dropExisting();
});

describe("process Metadata", () => {
  it("should return an empty array when responseBody is empty", () => {
    const result = processMetadata([]);
    expect(result).toEqual([]);
  });

  it("should map each object in responseBody to the correct output structure", () => {
    const date1 = new Date();
    const date2 = new Date();
    const date3 = new Date();

    const responseBody: MetadataModel[] = [
      {
        eicr_id: "ecr1",
        date_created: date1,
        first_name: "Test",
        last_name: "Person",
        birth_date: date2,
        encounter_start_date: date3,
        conditions: ["Long"],
        rule_summaries: ["Longer"],
        set_id: "123",
        eicr_version_number: "1",
        related_ecrs: [],
      },
      {
        eicr_id: "ecr2",
        date_created: date1,
        first_name: "Another",
        last_name: "Test",
        birth_date: date2,
        encounter_start_date: date3,
        conditions: ["Stuff"],
        rule_summaries: ["Other stuff", "Even more stuff"],
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
    const result = processMetadata(responseBody);
    expect(result).toEqual(expected);
  });
});

describe("listEcrData - core", () => {
  const checkAuditLog = async (
    startIndex: number,
    itemsPerPage: number,
    sortColumn: string,
    sortDirection: string,
  ) => {
    const log = await getLastAuditLog();
    expect(log.subject).toEqual("ecr");
    expect(log.action).toEqual("query");
    expect(JSON.parse(log.parameter_json)).toStrictEqual({
      startIndex,
      itemsPerPage,
      sortColumn,
      sortDirection,
      filterDates: {
        startDate: filterDates.startDate.toISOString(),
        endDate: filterDates.endDate.toISOString(),
      },
    });
  };

  it("should return empty array when no data is found", async () => {
    const startIndex = 0;
    const itemsPerPage = 25;
    const sortColumn = "date_created";
    const sortDirection = "DESC";

    const actual = await listEcrData({
      startIndex,
      itemsPerPage,
      sortColumn,
      sortDirection,
      filterDates,
    });
    checkAuditLog(startIndex, itemsPerPage, sortColumn, sortDirection);
    expect(actual).toBeEmpty();

    const actualCount = await getTotalEcrCount(filterDates);
    expect(actualCount).toEqual(actual.length);
  });

  it("should return all data when found for admin", async () => {
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

    const startIndex = 0;
    const itemsPerPage = 25;
    const sortColumn = "date_created";
    const sortDirection = "DESC";
    const actual: EcrDisplay[] = await listEcrData({
      startIndex,
      itemsPerPage,
      sortColumn,
      sortDirection,
      filterDates,
    });
    checkAuditLog(startIndex, itemsPerPage, sortColumn, sortDirection);
    expect(actual).toStrictEqual([
      {
        date_created: "12/02/2024 7:00\u00A0AM\u00A0EST",
        ecrId: "12345",
        patient_date_of_birth: "12/01/2024",
        patient_first_name: "Billy",
        patient_last_name: "Bob",
        patient_report_date: "12/02/2024 7:00\u00A0AM\u00A0EST",
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

    const actualCount = await getTotalEcrCount(filterDates);
    expect(actualCount).toEqual(actual.length);

    await clearEcrCore();
  });

  it("should not return unauthorized data when found for standard user", async () => {
    (getLoggedInUserSession as jest.Mock).mockResolvedValue({
      email: "standard@standard.com",
    });
    await createCoreEcr(coreTemplate);
    await createCoreEcr({ ...coreTemplate, ...relatedEcr });
    await createEcrCondition({
      uuid: "12345",
      eicr_id: "12345",
      condition: "Condition1",
      // no condition code
    });
    await createEcrCondition({
      uuid: "23456",
      eicr_id: "12345",
      condition: "Condition2",
      condition_code: "456", // not in user's program
    });
    await createEcrRule({
      uuid: "12345",
      ecr_rr_conditions_id: "12345",
      rule_summary: "Rule1",
    });

    const startIndex = 0;
    const itemsPerPage = 25;
    const sortColumn = "date_created";
    const sortDirection = "DESC";
    const actual: EcrDisplay[] = await listEcrData({
      startIndex,
      itemsPerPage,
      sortColumn,
      sortDirection,
      filterDates,
    });
    checkAuditLog(startIndex, itemsPerPage, sortColumn, sortDirection);
    expect(actual).toStrictEqual([]);

    const actualCount = await getTotalEcrCount(filterDates);
    expect(actualCount).toEqual(actual.length);

    await clearEcrCore();
  });

  it("should return authorized data when found for standard user", async () => {
    (getLoggedInUserSession as jest.Mock).mockResolvedValue({
      email: "standard@standard.com",
    });
    await createCoreEcr(coreTemplate);
    await createCoreEcr({ ...coreTemplate, ...relatedEcr });
    await createEcrCondition({
      uuid: "12345",
      eicr_id: "12345",
      condition: "Condition1",
      condition_code: "123",
    });
    await createEcrRule({
      uuid: "12345",
      ecr_rr_conditions_id: "12345",
      rule_summary: "Rule1",
    });

    const startIndex = 0;
    const itemsPerPage = 25;
    const sortColumn = "date_created";
    const sortDirection = "DESC";
    const actual: EcrDisplay[] = await listEcrData({
      startIndex,
      itemsPerPage,
      sortColumn,
      sortDirection,
      filterDates,
    });
    checkAuditLog(startIndex, itemsPerPage, sortColumn, sortDirection);
    expect(actual).toStrictEqual([
      {
        date_created: "12/02/2024 7:00\u00A0AM\u00A0EST",
        ecrId: "12345",
        patient_date_of_birth: "12/01/2024",
        patient_first_name: "Billy",
        patient_last_name: "Bob",
        patient_report_date: "12/02/2024 7:00\u00A0AM\u00A0EST",
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

    const actualCount = await getTotalEcrCount(filterDates);
    expect(actualCount).toEqual(actual.length);

    await clearEcrCore();
  });

  it("should return no data when no user", async () => {
    (getLoggedInUserSession as jest.Mock).mockResolvedValue(undefined);
    await createCoreEcr(coreTemplate);
    await createCoreEcr({ ...coreTemplate, ...relatedEcr });
    await createEcrCondition({
      uuid: "12345",
      eicr_id: "12345",
      condition: "Condition1",
      condition_code: "123",
    });
    await createEcrRule({
      uuid: "12345",
      ecr_rr_conditions_id: "12345",
      rule_summary: "Rule1",
    });

    const startIndex = 0;
    const itemsPerPage = 25;
    const sortColumn = "date_created";
    const sortDirection = "DESC";
    const actual: EcrDisplay[] = await listEcrData({
      startIndex,
      itemsPerPage,
      sortColumn,
      sortDirection,
      filterDates,
    });
    checkAuditLog(startIndex, itemsPerPage, sortColumn, sortDirection);
    expect(actual).toStrictEqual([]);

    const actualCount = await getTotalEcrCount(filterDates);
    expect(actualCount).toEqual(actual.length);

    await clearEcrCore();
  });
});

describe("get total core ecr count", () => {
  beforeAll(async () => {
    await createCoreEcr(coreTemplate);
    await createCoreEcr({ ...coreTemplate, ...relatedEcr });
  });

  afterAll(async () => {
    await clearEcrCore();
  });

  it("should call db to get all ecrs", async () => {
    const actual = await getTotalEcrCount(filterDates);
    expect(actual).toEqual(1);
  });
  it("should use search term in count query", async () => {
    const actual = await getTotalEcrCount(filterDates, "blah", undefined);
    expect(actual).toEqual(0);
  });
  it("should escape the search term in count query", async () => {
    const actual = await getTotalEcrCount(filterDates, "O'Riley", undefined);
    expect(actual).toEqual(0);
  });
  it("should use filter conditions in count query", async () => {
    const actual = await getTotalEcrCount(filterDates, "", [
      "Anthrax (disorder)",
    ]);
    expect(actual).toEqual(0);
  });
});

describe("generate search statement", () => {
  it("should use the search term in the search statement", () => {
    const { sql, params } = getWhere((eb) =>
      generateSearchStatement(eb, "Dan"),
    );
    if (process.env.METADATA_DATABASE_TYPE === "postgres") {
      expect(sql).toEqual(
        '("test_ev_schema"."ecr_data"."first_name" ilike $1 or "test_ev_schema"."ecr_data"."last_name" ilike $2)',
      );
    } else if (process.env.METADATA_DATABASE_TYPE === "sqlserver") {
      expect(sql).toEqual(
        '("test_ev_schema"."ecr_data"."first_name" like @1 or "test_ev_schema"."ecr_data"."last_name" like @2)',
      );
    }
    expect(params).toStrictEqual(["%Dan%", "%Dan%"]);
  });
  it("should escape characters when an apostrophe is added", () => {
    const { sql, params } = getWhere((eb) =>
      generateSearchStatement(eb, "O'Riley"),
    );
    if (process.env.METADATA_DATABASE_TYPE === "postgres") {
      expect(sql).toEqual(
        '("test_ev_schema"."ecr_data"."first_name" ilike $1 or "test_ev_schema"."ecr_data"."last_name" ilike $2)',
      );
    } else if (process.env.METADATA_DATABASE_TYPE === "sqlserver") {
      expect(sql).toEqual(
        '("test_ev_schema"."ecr_data"."first_name" like @1 or "test_ev_schema"."ecr_data"."last_name" like @2)',
      );
    }

    expect(params).toStrictEqual(["%O'Riley%", "%O'Riley%"]);
  });
  it("should only generate true statements when no search is provided", () => {
    const { sql, params } = getWhere((eb) => generateSearchStatement(eb, ""));
    if (process.env.METADATA_DATABASE_TYPE === "postgres") {
      expect(sql).toEqual("$1 = $2");
    } else if (process.env.METADATA_DATABASE_TYPE === "sqlserver") {
      expect(sql).toEqual("@1 = @2");
    }
    expect(params).toStrictEqual([true, true]);
  });
});

describe.each([
  {
    scenario: "without eCRs with no conditions reported",
    testConditions: ["Condition1", "Condition2"],
    expectedPostgresSQL:
      'exists (select "erc_sub"."eicr_id" from "test_ev_schema"."ecr_rr_conditions" as "erc_sub" where "erc_sub"."eicr_id" = "test_ev_schema"."ecr_data"."eicr_id" and ("erc_sub"."condition" is not null and ("erc_sub"."condition" ilike $1 or "erc_sub"."condition" ilike $2)))',
    expectedSqlServerSQL:
      'exists (select "erc_sub"."eicr_id" from "test_ev_schema"."ecr_rr_conditions" as "erc_sub" where "erc_sub"."eicr_id" = "test_ev_schema"."ecr_data"."eicr_id" and ("erc_sub"."condition" is not null and ("erc_sub"."condition" like @1 or "erc_sub"."condition" like @2)))',
    expectedParams: ["%Condition1%", "%Condition2%"],
    user: mockAdmin
  },
  {
    scenario: "with eCRs with no conditions reported - admin",
    testConditions: ["No conditions reported", "Condition1", "Condition2"],
    expectedPostgresSQL:
      '(not exists (select "erc_sub"."eicr_id" from "test_ev_schema"."ecr_rr_conditions" as "erc_sub" where "erc_sub"."eicr_id" = "test_ev_schema"."ecr_data"."eicr_id") or exists (select "erc_sub"."eicr_id" from "test_ev_schema"."ecr_rr_conditions" as "erc_sub" where "erc_sub"."eicr_id" = "test_ev_schema"."ecr_data"."eicr_id" and ("erc_sub"."condition" is not null and ("erc_sub"."condition" ilike $1 or "erc_sub"."condition" ilike $2))))',
    expectedSqlServerSQL:
      '(not exists (select "erc_sub"."eicr_id" from "test_ev_schema"."ecr_rr_conditions" as "erc_sub" where "erc_sub"."eicr_id" = "test_ev_schema"."ecr_data"."eicr_id") or exists (select "erc_sub"."eicr_id" from "test_ev_schema"."ecr_rr_conditions" as "erc_sub" where "erc_sub"."eicr_id" = "test_ev_schema"."ecr_data"."eicr_id" and ("erc_sub"."condition" is not null and ("erc_sub"."condition" like @1 or "erc_sub"."condition" like @2))))',
    expectedParams: ["%Condition1%", "%Condition2%"],
    user: mockAdmin
  },
    {
    scenario: "with eCRs with no conditions reported - standard user",
    testConditions: ["No conditions reported", "Condition1", "Condition2"],
    expectedPostgresSQL:
      'exists (select "erc_sub"."eicr_id" from "test_ev_schema"."ecr_rr_conditions" as "erc_sub" where "erc_sub"."eicr_id" = "test_ev_schema"."ecr_data"."eicr_id" and ("erc_sub"."condition" is not null and ("erc_sub"."condition" ilike $1 or "erc_sub"."condition" ilike $2)))',
    expectedSqlServerSQL:
      'exists (select "erc_sub"."eicr_id" from "test_ev_schema"."ecr_rr_conditions" as "erc_sub" where "erc_sub"."eicr_id" = "test_ev_schema"."ecr_data"."eicr_id" and ("erc_sub"."condition" is not null and ("erc_sub"."condition" like @1 or "erc_sub"."condition" like @2)))',
    expectedParams: ["%Condition1%", "%Condition2%"],
    user: mockStandardUser
  },
  {
    scenario: "when de-selecting all",
    testConditions: [""],
    expectedPostgresSQL: "$1 = $2",
    expectedSqlServerSQL: "@1 = @2",
    expectedParams: [true, false],
    user: mockAdmin
  },
  {
    scenario: "when selecting all",
    testConditions: undefined,
    expectedPostgresSQL: "$1 = $2",
    expectedSqlServerSQL: "@1 = @2",
    expectedParams: [true, true],
    user: mockAdmin
  },
])(
  "generate filter conditions statement $scenario",
  ({
    scenario,
    testConditions,
    expectedPostgresSQL,
    expectedSqlServerSQL,
    expectedParams,
    user
  }) => {
    it("should add conditions in the filter statement", () => {
      const { sql, params } = getWhere((eb) =>
        generateFilterConditionsStatement(eb, testConditions, user),
      );

      if (process.env.METADATA_DATABASE_TYPE === "postgres") {
        expect(sql).toEqual(expectedPostgresSQL);
      } else if (process.env.METADATA_DATABASE_TYPE === "sqlserver") {
        expect(sql).toEqual(expectedSqlServerSQL);
      }
      expect(params).toStrictEqual(expectedParams);
    });

    it("should add date range in the filter statement", () => {
      const { sql, params } = getWhere((eb) =>
        generateFilterDateStatement(eb, filterDates),
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
        filterDates.startDate,
        filterDates.endDate,
      ]);
    });

    it("should display all conditions in date range by default if no filter has been added", () => {
      const { sql, params } = getWhere((eb) =>
        generateWhereStatement(eb, filterDates, "", undefined, user),
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
        filterDates.startDate,
        filterDates.endDate,
        true,
        true,
      ]);
    });
  },
);

describe("generate where statement", () => {
  it("should generate where statement using search and filter statements", () => {
    const { sql, params } = getWhere((eb) =>
      generateWhereStatement(eb, filterDates, "blah", ["Anthrax (disorder)"], mockAdmin),
    );
    if (process.env.METADATA_DATABASE_TYPE === "postgres") {
      expect(sql).toEqual(
        '(("test_ev_schema"."ecr_data"."first_name" ilike $1 or "test_ev_schema"."ecr_data"."last_name" ilike $2) and ("test_ev_schema"."ecr_data"."date_created" >= $3 and "test_ev_schema"."ecr_data"."date_created" <= $4) and exists (select "erc_sub"."eicr_id" from "test_ev_schema"."ecr_rr_conditions" as "erc_sub" where "erc_sub"."eicr_id" = "test_ev_schema"."ecr_data"."eicr_id" and ("erc_sub"."condition" is not null and "erc_sub"."condition" ilike $5)))',
      );
    } else if (process.env.METADATA_DATABASE_TYPE === "sqlserver") {
      expect(sql).toEqual(
        '(("test_ev_schema"."ecr_data"."first_name" like @1 or "test_ev_schema"."ecr_data"."last_name" like @2) and ("test_ev_schema"."ecr_data"."date_created" >= @3 and "test_ev_schema"."ecr_data"."date_created" <= @4) and exists (select "erc_sub"."eicr_id" from "test_ev_schema"."ecr_rr_conditions" as "erc_sub" where "erc_sub"."eicr_id" = "test_ev_schema"."ecr_data"."eicr_id" and ("erc_sub"."condition" is not null and "erc_sub"."condition" like @5)))',
      );
    }

    expect(params).toStrictEqual([
      "%blah%",
      "%blah%",
      filterDates.startDate,
      filterDates.endDate,
      "%Anthrax (disorder)%",
    ]);
  });
  it("should generate where statement using search statement (no conditions filter provided)", () => {
    const { sql, params } = getWhere((eb) =>
      generateWhereStatement(eb, filterDates, "blah", undefined, mockAdmin),
    );
    if (process.env.METADATA_DATABASE_TYPE === "postgres") {
      expect(sql).toEqual(
        '(("test_ev_schema"."ecr_data"."first_name" ilike $1 or "test_ev_schema"."ecr_data"."last_name" ilike $2) and ("test_ev_schema"."ecr_data"."date_created" >= $3 and "test_ev_schema"."ecr_data"."date_created" <= $4) and $5 = $6)',
      );
    } else if (process.env.METADATA_DATABASE_TYPE === "sqlserver") {
      expect(sql).toEqual(
        '(("test_ev_schema"."ecr_data"."first_name" like @1 or "test_ev_schema"."ecr_data"."last_name" like @2) and ("test_ev_schema"."ecr_data"."date_created" >= @3 and "test_ev_schema"."ecr_data"."date_created" <= @4) and @5 = @6)',
      );
    }

    expect(params).toStrictEqual([
      "%blah%",
      "%blah%",
      filterDates.startDate,
      filterDates.endDate,
      true,
      true,
    ]);
  });
  it("should generate where statement using filter conditions statement (no search provided)", () => {
    const { sql, params } = getWhere((eb) =>
      generateWhereStatement(eb, filterDates, "", ["Anthrax (disorder)"], mockAdmin),
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
      filterDates.startDate,
      filterDates.endDate,
      "%Anthrax (disorder)%",
    ]);
  });
});
