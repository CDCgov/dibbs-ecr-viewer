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
  generateSortStatement,
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

const listParams = {
  startIndex: 0,
  itemsPerPage: 25,
  sortColumn: "date_created",
  sortDirection: "DESC",
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
  facility_name: "Hospital A",
};

// prior version of ecr
const relatedEcr = {
  eicr_id: `36545`,
  eicr_version_number: "1",
  date_created: new Date("2024-12-01T11:00:00Z"),
};

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
        facility_name: "Hospital A",
        conditions: ["Long"],
        rule_summaries: [{ condition: "Long", rule_summaries: ["Longer"] }],
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
        facility_name: undefined,
        conditions: ["Stuff"],
        rule_summaries: [
          {
            condition: "Stuff",
            rule_summaries: ["Other stuff", "Even more stuff"],
          },
        ],
        set_id: "124",
        eicr_version_number: "1",
        related_ecrs: [],
      },
    ];

    const expected: EcrDisplay[] = [
      {
        ecrId: "ecr1",
        facility_name: "Hospital A",
        date_created: formatDateTime(date1.toISOString()),
        patient_first_name: "Test",
        patient_last_name: "Person",
        patient_date_of_birth: formatDate(date2.toISOString()),
        patient_report_date: formatDateTime(date3.toISOString()),
        reportable_conditions: expect.arrayContaining(["Long"]),
        rule_summaries: expect.arrayContaining([
          { condition: "Long", rule_summaries: ["Longer"] },
        ]),
        eicr_set_id: "123",
        eicr_version_number: "1",
        related_ecrs: [],
      },
      {
        ecrId: "ecr2",
        facility_name: "",
        date_created: formatDateTime(date1.toISOString()),
        patient_first_name: "Another",
        patient_last_name: "Test",
        patient_date_of_birth: formatDate(date2.toISOString()),
        patient_report_date: formatDateTime(date3.toISOString()),
        reportable_conditions: expect.arrayContaining(["Stuff"]),
        rule_summaries: expect.arrayContaining([
          {
            condition: "Stuff",
            rule_summaries: expect.arrayContaining([
              "Other stuff",
              "Even more stuff",
            ]),
          },
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

describe("generate sort statement", () => {
  it.each([
    ["ASC", "asc"],
    ["DESC", "desc"],
  ])("should sort Organization %s", (direction, expectedDirection) => {
    expect(generateSortStatement("organization", direction)).toStrictEqual([
      { column: "facility_name", direction: expectedDirection },
    ]);
  });
});

describe("listEcrData - core", () => {
  const expectedEcr: EcrDisplay = {
    date_created: "12/02/2024 7:00\u00A0AM\u00A0EST",
    ecrId: "12345",
    facility_name: "Hospital A",
    patient_date_of_birth: "12/01/2024",
    patient_first_name: "Billy",
    patient_last_name: "Bob",
    patient_report_date: "12/02/2024 7:00\u00A0AM\u00A0EST",
    reportable_conditions: ["Condition1"],
    rule_summaries: [{ condition: "Condition1", rule_summaries: ["Rule1"] }],
    eicr_set_id: "123",
    eicr_version_number: "2",
    related_ecrs: [{ ...relatedEcr, set_id: "123" }],
  };

  const createListEcrFixture = async ({
    conditionCode,
    includeUnauthorizedCondition = false,
  }: {
    conditionCode?: string;
    includeUnauthorizedCondition?: boolean;
  } = {}) => {
    await createCoreEcr(coreTemplate);
    await createCoreEcr({ ...coreTemplate, ...relatedEcr });
    await createEcrCondition({
      uuid: "12345",
      eicr_id: "12345",
      condition: "Condition1",
      ...(conditionCode && { condition_code: conditionCode }),
    });

    if (includeUnauthorizedCondition) {
      await createEcrCondition({
        uuid: "23456",
        eicr_id: "12345",
        condition: "Condition2",
        condition_code: "456",
      });
    }

    await createEcrRule({
      uuid: "12345",
      ecr_rr_conditions_id: "12345",
      rule_summary: "Rule1",
    });
  };

  const checkAuditLog = async () => {
    const log = await getLastAuditLog();
    expect(log.subject).toEqual("ecr");
    expect(log.action).toEqual("query");
    expect(JSON.parse(log.parameter_json)).toStrictEqual({
      startIndex: listParams.startIndex,
      itemsPerPage: listParams.itemsPerPage,
      sortColumn: listParams.sortColumn,
      sortDirection: listParams.sortDirection,
      filterDates: {
        startDate: filterDates.startDate.toISOString(),
        endDate: filterDates.endDate.toISOString(),
      },
    });
  };

  const expectListResults = async (expected: EcrDisplay[]) => {
    const actual = await listEcrData({ ...listParams, filterDates });
    await checkAuditLog();
    expect(actual).toStrictEqual(expected);

    const actualCount = await getTotalEcrCount(filterDates);
    expect(actualCount).toEqual(actual.length);
  };

  afterEach(async () => {
    await clearEcrCore();
  });

  it("should return empty array when no data is found", async () => {
    await expectListResults([]);
  });

  it("should return all data when found for admin", async () => {
    await createListEcrFixture();
    await expectListResults([expectedEcr]);
  });

  describe.each([
    {
      userType: "standard user",
      email: "standard@standard.com",
    },
    {
      userType: "program admin",
      email: "programadmin@programadmin.com",
    },
  ])("when logged in as a $userType", ({ email }) => {
    beforeEach(() => {
      (getLoggedInUserSession as jest.Mock).mockResolvedValue({ email });
    });

    it("should not return unauthorized data", async () => {
      // Condition 1 has no condition code. Condition2 is unauthorized
      await createListEcrFixture({ includeUnauthorizedCondition: true });
      await expectListResults([]);
    });

    it("should return authorized data", async () => {
      await createListEcrFixture({ conditionCode: "123" });
      await expectListResults([expectedEcr]);
    });
  });

  it("should return populated data when version number is missing", async () => {
    const missingVersionEcr = {
      ...coreTemplate,
      eicr_id: "missing-version-eicr-id",
      set_id: "missing-version-set-id",
      eicr_version_number: undefined,
    };

    await createCoreEcr(missingVersionEcr);
    await createEcrCondition({
      uuid: "missing-version-condition",
      eicr_id: "missing-version-eicr-id",
      condition: "Condition1",
    });
    await createEcrRule({
      uuid: "missing-version-rule",
      ecr_rr_conditions_id: "missing-version-condition",
      rule_summary: "Rule1",
    });

    const actual: EcrDisplay[] = await listEcrData({
      startIndex: 0,
      itemsPerPage: 25,
      sortColumn: "date_created",
      sortDirection: "DESC",
      filterDates,
    });

    expect(actual).toHaveLength(1);
    expect(actual[0].ecrId).toEqual("missing-version-eicr-id");
    expect(actual[0].eicr_set_id).toEqual("missing-version-set-id");
    expect(actual[0].eicr_version_number).toBeFalsy();
    expect(actual[0].patient_first_name).toEqual("Billy");
    expect(actual[0].patient_last_name).toEqual("Bob");
    expect(actual[0].patient_date_of_birth).toEqual("12/01/2024");
    expect(actual[0].date_created).toEqual("12/02/2024 7:00\u00A0AM\u00A0EST");
    expect(actual[0].patient_report_date).toEqual(
      "12/02/2024 7:00\u00A0AM\u00A0EST",
    );
    expect(actual[0].facility_name).toEqual("Hospital A");
    expect(actual[0].reportable_conditions).toEqual(["Condition1"]);
    expect(actual[0].rule_summaries).toEqual([
      { condition: "Condition1", rule_summaries: ["Rule1"] },
    ]);
    expect(actual[0].related_ecrs).toEqual([]);

    await clearEcrCore();
  });

  it("should return no data when no user", async () => {
    (getLoggedInUserSession as jest.Mock).mockResolvedValue(undefined);
    await createListEcrFixture({ conditionCode: "123" });
    await expectListResults([]);
  });

  it("should order related_ecrs by version number descending regardless of date_created order", async () => {
    // v3 is the max version but has the oldest date_created — this is the divergence the fix addresses
    const v3 = {
      ...coreTemplate,
      eicr_id: "99003",
      eicr_version_number: "3",
      date_created: new Date("2024-12-01T10:00:00Z"),
    };
    const v2 = {
      ...coreTemplate,
      eicr_id: "99002",
      eicr_version_number: "2",
      date_created: new Date("2024-12-02T08:00:00Z"),
    };
    // v1 has the newest date_created but is the oldest version — ordering by date would put it first
    const v1 = {
      ...coreTemplate,
      eicr_id: "99001",
      eicr_version_number: "1",
      date_created: new Date("2024-12-02T14:00:00Z"),
    };

    await createCoreEcr(v3);
    await createCoreEcr(v2);
    await createCoreEcr(v1);

    const actual: EcrDisplay[] = await listEcrData({
      ...listParams,
      filterDates,
    });

    expect(actual).toHaveLength(1);
    expect(actual[0].eicr_version_number).toEqual("3");
    expect(actual[0].related_ecrs).toStrictEqual([
      {
        eicr_id: "99002",
        eicr_version_number: "2",
        date_created: v2.date_created,
        set_id: "123",
      },
      {
        eicr_id: "99001",
        eicr_version_number: "1",
        date_created: v1.date_created,
        set_id: "123",
      },
    ]);
  });

  it("should return expected results when search term matches patient first, last, or full name", async () => {
    await createCoreEcr(coreTemplate);

    // Test first name match
    let actual = await listEcrData({
      ...listParams,
      filterDates,
      searchTerm: "Billy",
    });
    expect(actual).toHaveLength(1);
    expect(actual[0].patient_first_name).toEqual("Billy");

    // Test last name match
    actual = await listEcrData({
      ...listParams,
      filterDates,
      searchTerm: "Bob",
    });
    expect(actual).toHaveLength(1);
    expect(actual[0].patient_last_name).toEqual("Bob");

    // Test full name match
    actual = await listEcrData({
      ...listParams,
      filterDates,
      searchTerm: "Billy Bob",
    });
    expect(actual).toHaveLength(1);
    expect(actual[0].patient_first_name).toEqual("Billy");
    expect(actual[0].patient_last_name).toEqual("Bob");
  });
});

describe("listEcrData - multi-version condition aggregation", () => {
  beforeEach(async () => {
    await createCoreEcr(coreTemplate); // v2
    await createCoreEcr({ ...coreTemplate, ...relatedEcr }); // v1, same set_id
    await createEcrCondition({
      uuid: "cond-v2",
      eicr_id: "12345",
      condition: "Condition1",
    });
    await createEcrCondition({
      uuid: "cond-v1",
      eicr_id: "36545",
      condition: "Condition2",
    });
  });

  afterEach(async () => {
    await clearEcrCore();
  });

  it("should show conditions from all versions when no filter is applied", async () => {
    const actual = await listEcrData({
      ...listParams,
      filterDates,
    });

    expect(actual).toHaveLength(1);
    expect(actual[0].eicr_version_number).toBe("2");
    expect(actual[0].reportable_conditions).toEqual(
      expect.arrayContaining(["Condition1", "Condition2"]),
    );
    expect(actual[0].reportable_conditions).toHaveLength(2);
  });

  it("should not show conditions from later versions when a condition filter matches an earlier version", async () => {
    const actual = await listEcrData({
      ...listParams,
      filterDates,
      filterConditions: ["Condition2"],
    });

    expect(actual).toHaveLength(1);
    expect(actual[0].eicr_version_number).toBe("1");
    expect(actual[0].reportable_conditions).toEqual(["Condition2"]);
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
        '("test_ev_schema"."ecr_data"."first_name" ilike $1 or "test_ev_schema"."ecr_data"."last_name" ilike $2 or CONCAT(ecr_data.first_name, \' \', ecr_data.last_name) ilike $3)',
      );
    } else if (process.env.METADATA_DATABASE_TYPE === "sqlserver") {
      expect(sql).toEqual(
        '("test_ev_schema"."ecr_data"."first_name" like @1 or "test_ev_schema"."ecr_data"."last_name" like @2 or CONCAT(ecr_data.first_name, \' \', ecr_data.last_name) like @3)',
      );
    }
    expect(params).toStrictEqual(["%Dan%", "%Dan%", "%Dan%"]);
  });
  it("should escape characters when an apostrophe is added", () => {
    const { sql, params } = getWhere((eb) =>
      generateSearchStatement(eb, "O'Riley"),
    );
    if (process.env.METADATA_DATABASE_TYPE === "postgres") {
      expect(sql).toEqual(
        '("test_ev_schema"."ecr_data"."first_name" ilike $1 or "test_ev_schema"."ecr_data"."last_name" ilike $2 or CONCAT(ecr_data.first_name, \' \', ecr_data.last_name) ilike $3)',
      );
    } else if (process.env.METADATA_DATABASE_TYPE === "sqlserver") {
      expect(sql).toEqual(
        '("test_ev_schema"."ecr_data"."first_name" like @1 or "test_ev_schema"."ecr_data"."last_name" like @2 or CONCAT(ecr_data.first_name, \' \', ecr_data.last_name) like @3)',
      );
    }

    expect(params).toStrictEqual(["%O'Riley%", "%O'Riley%", "%O'Riley%"]);
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
    isAdmin: true,
  },
  {
    scenario: "with eCRs with no conditions reported - admin",
    testConditions: ["No conditions reported", "Condition1", "Condition2"],
    expectedPostgresSQL:
      '(not exists (select "erc_sub"."eicr_id" from "test_ev_schema"."ecr_rr_conditions" as "erc_sub" where "erc_sub"."eicr_id" = "test_ev_schema"."ecr_data"."eicr_id") or exists (select "erc_sub"."eicr_id" from "test_ev_schema"."ecr_rr_conditions" as "erc_sub" where "erc_sub"."eicr_id" = "test_ev_schema"."ecr_data"."eicr_id" and ("erc_sub"."condition" is not null and ("erc_sub"."condition" ilike $1 or "erc_sub"."condition" ilike $2))))',
    expectedSqlServerSQL:
      '(not exists (select "erc_sub"."eicr_id" from "test_ev_schema"."ecr_rr_conditions" as "erc_sub" where "erc_sub"."eicr_id" = "test_ev_schema"."ecr_data"."eicr_id") or exists (select "erc_sub"."eicr_id" from "test_ev_schema"."ecr_rr_conditions" as "erc_sub" where "erc_sub"."eicr_id" = "test_ev_schema"."ecr_data"."eicr_id" and ("erc_sub"."condition" is not null and ("erc_sub"."condition" like @1 or "erc_sub"."condition" like @2))))',
    expectedParams: ["%Condition1%", "%Condition2%"],
    isAdmin: true,
  },
  {
    scenario: "with eCRs with no conditions reported - standard user",
    testConditions: ["No conditions reported", "Condition1", "Condition2"],
    expectedPostgresSQL:
      'exists (select "erc_sub"."eicr_id" from "test_ev_schema"."ecr_rr_conditions" as "erc_sub" where "erc_sub"."eicr_id" = "test_ev_schema"."ecr_data"."eicr_id" and ("erc_sub"."condition" is not null and ("erc_sub"."condition" ilike $1 or "erc_sub"."condition" ilike $2)))',
    expectedSqlServerSQL:
      'exists (select "erc_sub"."eicr_id" from "test_ev_schema"."ecr_rr_conditions" as "erc_sub" where "erc_sub"."eicr_id" = "test_ev_schema"."ecr_data"."eicr_id" and ("erc_sub"."condition" is not null and ("erc_sub"."condition" like @1 or "erc_sub"."condition" like @2)))',
    expectedParams: ["%Condition1%", "%Condition2%"],
    isAdmin: false,
  },
  {
    scenario: "when de-selecting all",
    testConditions: [""],
    expectedPostgresSQL: "$1 = $2",
    expectedSqlServerSQL: "@1 = @2",
    expectedParams: [true, false],
    isAdmin: true,
  },
  {
    scenario: "when selecting all",
    testConditions: undefined,
    expectedPostgresSQL: "$1 = $2",
    expectedSqlServerSQL: "@1 = @2",
    expectedParams: [true, true],
    isAdmin: true,
  },
])(
  "generate filter conditions statement $scenario",
  ({
    // eslint-disable-next-line unused-imports/no-unused-vars
    scenario,
    testConditions,
    expectedPostgresSQL,
    expectedSqlServerSQL,
    expectedParams,
    isAdmin,
  }) => {
    it("should add conditions in the filter statement", () => {
      const { sql, params } = getWhere((eb) =>
        generateFilterConditionsStatement(eb, testConditions, isAdmin),
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
        generateWhereStatement(eb, filterDates, "", undefined, isAdmin),
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
      generateWhereStatement(
        eb,
        filterDates,
        "blah",
        ["Anthrax (disorder)"],
        true,
      ),
    );
    if (process.env.METADATA_DATABASE_TYPE === "postgres") {
      expect(sql).toEqual(
        '(("test_ev_schema"."ecr_data"."first_name" ilike $1 or "test_ev_schema"."ecr_data"."last_name" ilike $2 or CONCAT(ecr_data.first_name, \' \', ecr_data.last_name) ilike $3) and ("test_ev_schema"."ecr_data"."date_created" >= $4 and "test_ev_schema"."ecr_data"."date_created" <= $5) and exists (select "erc_sub"."eicr_id" from "test_ev_schema"."ecr_rr_conditions" as "erc_sub" where "erc_sub"."eicr_id" = "test_ev_schema"."ecr_data"."eicr_id" and ("erc_sub"."condition" is not null and "erc_sub"."condition" ilike $6)))',
      );
    } else if (process.env.METADATA_DATABASE_TYPE === "sqlserver") {
      expect(sql).toEqual(
        '(("test_ev_schema"."ecr_data"."first_name" like @1 or "test_ev_schema"."ecr_data"."last_name" like @2 or CONCAT(ecr_data.first_name, \' \', ecr_data.last_name) like @3) and ("test_ev_schema"."ecr_data"."date_created" >= @4 and "test_ev_schema"."ecr_data"."date_created" <= @5) and exists (select "erc_sub"."eicr_id" from "test_ev_schema"."ecr_rr_conditions" as "erc_sub" where "erc_sub"."eicr_id" = "test_ev_schema"."ecr_data"."eicr_id" and ("erc_sub"."condition" is not null and "erc_sub"."condition" like @6)))',
      );
    }

    expect(params).toStrictEqual([
      "%blah%",
      "%blah%",
      "%blah%",
      filterDates.startDate,
      filterDates.endDate,
      "%Anthrax (disorder)%",
    ]);
  });
  it("should generate where statement using search statement (no conditions filter provided)", () => {
    const { sql, params } = getWhere((eb) =>
      generateWhereStatement(eb, filterDates, "blah", undefined, true),
    );
    if (process.env.METADATA_DATABASE_TYPE === "postgres") {
      expect(sql).toEqual(
        '(("test_ev_schema"."ecr_data"."first_name" ilike $1 or "test_ev_schema"."ecr_data"."last_name" ilike $2 or CONCAT(ecr_data.first_name, \' \', ecr_data.last_name) ilike $3) and ("test_ev_schema"."ecr_data"."date_created" >= $4 and "test_ev_schema"."ecr_data"."date_created" <= $5) and $6 = $7)',
      );
    } else if (process.env.METADATA_DATABASE_TYPE === "sqlserver") {
      expect(sql).toEqual(
        '(("test_ev_schema"."ecr_data"."first_name" like @1 or "test_ev_schema"."ecr_data"."last_name" like @2 or CONCAT(ecr_data.first_name, \' \', ecr_data.last_name) like @3) and ("test_ev_schema"."ecr_data"."date_created" >= @4 and "test_ev_schema"."ecr_data"."date_created" <= @5) and @6 = @7)',
      );
    }

    expect(params).toStrictEqual([
      "%blah%",
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
      generateWhereStatement(eb, filterDates, "", ["Anthrax (disorder)"], true),
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
