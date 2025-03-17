import { sql } from "kysely";
import { Kysely, ExpressionBuilder, sql } from "kysely";

import { Core } from "@/app/api/services/core_types";
import { getDb } from "@/app/api/services/database";
import { Extended } from "@/app/api/services/extended_types";
import { DateRangePeriod } from "@/app/utils/date-utils";

import { formatDate, formatDateTime } from "./formatDateService";

export interface CoreMetadataModel {
  eicr_id: string;
  data_source: "DB" | "S3";
  data_link: string;
  patient_name_first: string;
  patient_name_last: string;
  patient_birth_date: Date;
  conditions: string[];
  rule_summaries: string[];
  report_date: Date;
  date_created: Date;
  set_id: string | undefined;
  eicr_version_number: string | undefined;
}

export interface ExtendedMetadataModel {
  eicr_id: string;
  // data_source: "DB" | "S3";
  data_link: string;
  first_name: string;
  last_name: string;
  birth_date: Date;
  conditions: string;
  rule_summaries: string;
  encounter_start_date: Date;
  date_created: Date;
  set_id: string | undefined;
  eicr_version_number: string | undefined;
}

export interface EcrDisplay {
  ecrId: string;
  patient_first_name: string;
  patient_last_name: string;
  patient_date_of_birth: string | undefined;
  reportable_conditions: string[];
  rule_summaries: string[];
  patient_report_date: string;
  date_created: string;
  eicr_set_id: string | undefined;
  eicr_version_number: string | undefined;
}

/**
 * @param startIndex - The index of the first item to fetch
 * @param itemsPerPage - The number of items to fetch
 * @param sortColumn - The column to sort by
 * @param sortDirection - The direction to sort by
 * @param filterDates - The date (range) to filter on
 * @param searchTerm - The search term to use
 * @param filterConditions - The condition(s) to filter on
 * @returns A promise resolving to a list of eCR metadata
 */
export async function listEcrData(
  startIndex: number,
  itemsPerPage: number,
  sortColumn: string,
  sortDirection: string,
  filterDates: DateRangePeriod,
  searchTerm?: string,
  filterConditions?: string[],
): Promise<EcrDisplay[]> {
  const SCHEMA_TYPE = process.env.METADATA_DATABASE_SCHEMA;

  switch (SCHEMA_TYPE) {
    case "core":
      return listCoreEcrData(
        getDb() as Kysely<Core>,
        startIndex,
        itemsPerPage,
        sortColumn,
        sortDirection,
        filterDates,
        searchTerm,
        filterConditions,
      );
    case "extended":
      return listExtendedEcrData(
        getDb() as Kysely<Extended>,
        startIndex,
        itemsPerPage,
        sortColumn,
        sortDirection,
        filterDates,
        searchTerm,
        filterConditions,
      );
    default:
      throw new Error("Unsupported database type");
  }
}

async function listCoreEcrData(
  db: Kysely<Core>,
  startIndex: number,
  itemsPerPage: number,
  sortColumn: string,
  sortDirection: string,
  filterDates: DateRangePeriod,
  searchTerm?: string,
  filterConditions?: string[],
): Promise<EcrDisplay[]> {
  try {
    const query = db
      .selectFrom("ecr_data as ed")
      .leftJoin("ecr_rr_conditions as erc", "ed.eICR_ID", "erc.eICR_ID")
      .leftJoin(
        "ecr_rr_rule_summaries as ers",
        "erc.uuid",
        "ers.ecr_rr_conditions_id",
      )
      .select([
        "ed.eICR_ID as eicr_id",
        "ed.patient_name_first",
        "ed.patient_name_last",
        "ed.patient_birth_date",
        "ed.date_created",
        "ed.report_date",
        "ed.set_id",
        "ed.data_source",
        "ed.fhir_reference_link as data_link",
        "ed.eicr_version_number",
        sql<string[]>`ARRAY_AGG(DISTINCT erc.condition)`.as("conditions"),
        sql<string[]>`ARRAY_AGG(DISTINCT ers.rule_summary)`.as(
          "rule_summaries",
        ),
      ])
      .where((eb) =>
        generateCoreWhereStatement(
          eb,
          filterDates,
          searchTerm,
          filterConditions,
        ),
      )
      .groupBy([
        "ed.eICR_ID",
        "ed.patient_name_first",
        "ed.patient_name_last",
        "ed.patient_birth_date",
        "ed.date_created",
        "ed.report_date",
        "ed.set_id",
        "ed.data_source",
        "ed.fhir_reference_link",
        "ed.eicr_version_number",
      ])
      .orderBy(
        sql.ref(sortColumn) as any,
        sortDirection.toLowerCase() === "desc" ? "desc" : "asc",
      )
      .offset(startIndex)
      .limit(itemsPerPage);

    const result = await query.execute();
    return processCoreMetadata(result);
  } catch (error) {
    return Promise.reject(error);
  }
}

/**
 *
 * @param db
 * @param startIndex
 * @param itemsPerPage
 * @param sortColumn
 * @param sortDirection
 * @param filterDates
 * @param searchTerm
 * @param filterConditions
 */
export async function listExtendedEcrData(
  db: Kysely<Extended>,
  startIndex: number,
  itemsPerPage: number,
  sortColumn: string,
  sortDirection: string,
  filterDates: DateRangePeriod,
  searchTerm?: string,
  filterConditions?: string[],
): Promise<EcrDisplay[]> {
  try {
    const query = db
      .selectFrom("ecr_data as ed")
      .leftJoin("ecr_rr_conditions as erc", "ed.eICR_ID", "erc.eICR_ID")
      .leftJoin(
        "ecr_rr_rule_summaries as ers",
        "erc.uuid",
        "ers.ecr_rr_conditions_id",
      )
      .select([
        "ed.eICR_ID as eicr_id",
        "ed.first_name",
        "ed.last_name",
        "ed.birth_date",
        "ed.encounter_start_date",
        "ed.date_created",
        "ed.set_id",
        "ed.eicr_version_number",
        "ed.fhir_reference_link as data_link",
        sql<string>`ARRAY_AGG(DISTINCT erc.condition)`.as("conditions"),
        sql<string>`ARRAY_AGG(DISTINCT ers.rule_summary)`.as("rule_summaries"),
      ])
      .where((eb) =>
        generateExtendedWhereStatement(
          eb as ExpressionBuilder<Extended, "ecr_data">,
          filterDates,
          searchTerm,
          filterConditions,
        ),
      )
      .groupBy([
        "ed.eICR_ID",
        "ed.first_name",
        "ed.last_name",
        "ed.birth_date",
        "ed.encounter_start_date",
        "ed.date_created",
        "ed.set_id",
        "ed.fhir_reference_link",
        "ed.eicr_version_number",
      ])
      .orderBy(
        sql.ref(sortColumn),
        sortDirection.toLowerCase() === "desc" ? "desc" : "asc",
      )
      .offset(startIndex)
      .limit(itemsPerPage);

    const result = await query.execute();
    return processExtendedMetadata(result);
  } catch (error: unknown) {
    return Promise.reject(error);
  }
}

/**
 * Processes a list of eCR data retrieved from Postgres.
 * @param responseBody - The response body containing eCR data from Postgres.
 * @returns - The processed list of eCR IDs and dates.
 */
export const processCoreMetadata = (
  responseBody: CoreMetadataModel[],
): EcrDisplay[] => {
  return responseBody.map((object) => {
    return {
      ecrId: object.eicr_id || "",
      patient_first_name: object.patient_name_first || "",
      patient_last_name: object.patient_name_last || "",
      patient_date_of_birth: object.patient_birth_date
        ? formatDate(object.patient_birth_date.toISOString())
        : "",
      reportable_conditions: object.conditions || [],
      rule_summaries: object.rule_summaries || [],
      date_created: object.date_created
        ? formatDateTime(object.date_created.toISOString())
        : "",
      patient_report_date: object.report_date
        ? formatDateTime(object.report_date.toISOString())
        : "",
      eicr_set_id: object.set_id,
      eicr_version_number: object.eicr_version_number,
    };
  });
};

/**
 * Processes a list of eCR data retrieved from Postgres.
 * @param responseBody - The response body containing eCR data from Postgres.
 * @returns - The processed list of eCR IDs and dates.
 */
const processExtendedMetadata = (
  responseBody: ExtendedMetadataModel[],
): EcrDisplay[] => {
  return responseBody.map((object) => {
    const result = {
      ecrId: object.eicr_id || "",
      patient_first_name: object.first_name || "",
      patient_last_name: object.last_name || "",
      patient_date_of_birth: object.birth_date
        ? formatDate(object.birth_date.toISOString())
        : "",
      reportable_conditions: object.conditions?.split(",") ?? [],
      rule_summaries: object.rule_summaries?.split(",") ?? [],
      date_created: object.date_created
        ? formatDateTime(object.date_created.toISOString())
        : "",
      patient_report_date: object.encounter_start_date
        ? formatDateTime(object.encounter_start_date.toISOString())
        : "",
      eicr_set_id: object.set_id,
      eicr_version_number: object.eicr_version_number,
    };

    return result;
  });
};

/**
 * Retrieves the total number of eCRs stored in the ecr_data table.
 * @param filterDates - The date (range) to filter on
 * @param searchTerm - The search term used to filter the count query
 * @param filterConditions - The array of reportable conditions used to filter the count query
 * @returns A promise resolving to the total number of eCRs.
 */
export const getTotalEcrCount = async (
  filterDates: DateRangePeriod,
  searchTerm?: string,
  filterConditions?: string[],
): Promise<number> => {
  const SCHEMA_TYPE = process.env.METADATA_DATABASE_SCHEMA;

  switch (SCHEMA_TYPE) {
    case "core":
      return getTotalCoreEcrCount(filterDates, searchTerm, filterConditions);
    case "extended":
      return getTotalExtendedEcrCount(
        filterDates,
        searchTerm,
        filterConditions,
      );
    default:
      throw new Error("Unsupported database type");
  }
};

const getTotalCoreEcrCount = async (
  filterDates: DateRangePeriod,
  searchTerm?: string,
  filterConditions?: string[],
): Promise<number> => {
  var whereClause = generateCoreWhereStatement(
    filterDates,
    searchTerm,
    filterConditions,
  );
  const query = `SELECT count(DISTINCT ed.eICR_ID) as count FROM ecr_viewer.ecr_data as ed LEFT JOIN ecr_viewer.ecr_rr_conditions erc on ed.eICR_ID = erc.eICR_ID WHERE ${whereClause}`;
  const result = await sql.raw<{ count: string }>(query).execute(getDb());
  return parseInt(result.rows[0].count, 10);
};

const getTotalExtendedEcrCount = async (
  filterDates: DateRangePeriod,
  searchTerm?: string,
  filterConditions?: string[],
): Promise<number> => {
  try {
    const whereStatement = generateExtendedWhereStatement(
      filterDates,
      searchTerm,
      filterConditions,
    );

    const query = `SELECT COUNT(DISTINCT ed.eICR_ID) as count FROM ecr_viewer.ecr_data ed LEFT JOIN ecr_viewer.ecr_rr_conditions erc ON ed.eICR_ID = erc.eICR_ID WHERE ${whereStatement}`;
    const result = await sql.raw<{ count: string }>(query).execute(getDb());
    return parseInt(result.rows[0].count);
  } catch (error: unknown) {
    console.error(error);
    return Promise.reject(error);
  }
};

/**
 * A custom type format for where statement
 * @param eb
 * @param filterDates - The date (range) to filter on
 * @param searchTerm - Optional search term used to filter
 * @param filterConditions - Optional array of reportable conditions used to filter
 * @returns custom type format object for use by pg-promise
 */
export const generateCoreWhereStatement = (
  eb: ExpressionBuilder<any, any>,
  filterDates: DateRangePeriod,
  searchTerm?: string,
  filterConditions?: string[],
) => {
  return eb.and([
    generateCoreSearchStatement(eb, searchTerm),
    generateFilterDateStatement(eb, filterDates),
    generateFilterConditionsStatement(eb, filterConditions),
  ]);
};

/**
 *  Generate where statement for SQL Server
 * @param eb
 * @param filterDates - The date (range) to filter on
 * @param searchTerm - Optional search term used to filter
 * @param filterConditions - Optional array of reportable conditions used to filter
 * @returns - where statement for SQL Server
 */
const generateExtendedWhereStatement = (
  eb: ExpressionBuilder<Extended, "ecr_data">,
  filterDates: DateRangePeriod,
  searchTerm?: string,
  filterConditions?: string[],
) => {
  return eb.and(
    [
      generateExtendedSearchStatement(eb, searchTerm),
      generateFilterDateStatement(eb, filterDates),
      filterConditions?.length
        ? generateFilterConditionsStatementSqlServer(eb, filterConditions)
        : undefined,
    ].filter((condition) => condition !== undefined),
  );
};

/**
 * A custom type format for search statement
 * @param eb
 * @param searchTerm - Optional search term used to filter
 * @returns custom type format object for use by pg-promise
 */
export const generateCoreSearchStatement = (
  eb: ExpressionBuilder<any, any>,
  searchTerm?: string,
) => {
  if (!searchTerm) return sql`TRUE`; // No filtering needed

  return eb.or([
    eb("ed.patient_name_first", "ilike", `%${searchTerm}%`),
    eb("ed.patient_name_last", "ilike", `%${searchTerm}%`),
  ]);
};

const generateExtendedSearchStatement = (
  eb: ExpressionBuilder<Extended, "ecr_data">,
  searchTerm?: string,
) => {
  if (!searchTerm) {
    return eb.val(true);
  }

  return eb.or([
    eb(sql.ref("ed.first_name"), "ilike", `%${searchTerm}%`),
    eb(sql.ref("ed.last_name"), "ilike", `%${searchTerm}%`),
  ]);
};

/**
 * A custom type format for statement filtering conditions
 * @param eb
 * @param filterConditions - Optional array of reportable conditions used to filter
 * @returns custom type format object for use by pg-promise
 */
export const generateFilterConditionsStatement = (
  eb: ExpressionBuilder<any, any>,
  filterConditions?: string[],
) => {
  if (!filterConditions || filterConditions.length === 0) return sql`TRUE`;

  return eb.exists(
    eb
      .selectFrom("ecr_rr_conditions as erc_sub")
      .select("erc_sub.eICR_ID")
      .whereRef("erc_sub.eICR_ID", "=", "ed.eICR_ID")
      .where((subEb) =>
        subEb.or(
          filterConditions.map((condition) =>
            subEb("erc_sub.condition", "ilike", `%${condition}%`),
          ),
        ),
      ),
  );
};

const generateFilterConditionsStatementSqlServer = (
  eb: ExpressionBuilder<Extended, "ecr_data">,
  filterConditions: string[],
) => {
  if (filterConditions.every((item) => item === "")) {
    return eb(
      sql.ref("ed.eICR_ID"),
      "not in",
      (subQb: ExpressionBuilder<Extended, "ecr_rr_conditions">) =>
        subQb
          .selectFrom("ecr_rr_conditions as erc_sub")
          .select("erc_sub.eICR_ID")
          .where("erc_sub.condition", "is not", null),
    );
  }

  return eb(
    sql.ref("ed.eICR_ID"),
    "in",
    (subQb: ExpressionBuilder<Extended, "ecr_rr_conditions">) =>
      subQb
        .selectFrom("ecr_data as ed_sub")
        .leftJoin(
          "ecr_rr_conditions as erc_sub",
          "ed_sub.eICR_ID",
          "erc_sub.eICR_ID",
        )
        .select("ed_sub.eICR_ID")
        .where((eb) =>
          eb.and([
            eb("erc_sub.condition", "is not", null),
            eb.or(
              filterConditions.map((condition) =>
                eb("erc_sub.condition", "like", `%${condition}%`),
              ),
            ),
          ]),
        ),
  );
};

/**
 * A custom type format for statement filtering by date range
 * @param props - The props representing the date range to filter on
 * @param props.startDate - Start date of date range
 * @param props.endDate - End date of date range
 * @param eb
 * @param root0
 * @param root0.startDate
 * @param root0.endDate
 * @param eb.startDate
 * @param eb.endDate
 * @returns custom type format object for use by pg-promise
 */
export const generateFilterDateStatement = (
  eb: ExpressionBuilder<any, any>,
  { startDate, endDate }: DateRangePeriod,
) => {
  return eb.and([
    eb("ed.date_created", ">=", sql`${startDate.toISOString()}`),
    eb("ed.date_created", "<=", sql`${endDate.toISOString()}`),
  ]);
};

/**
 * A custom type format for sort statement
 * @param columnName - The column to sort by
 * @param direction - The direction to sort by
 * @returns custom type format object for use by pg-promise
 */
export const generateCoreSortStatement = (
  columnName: string,
  direction: string,
) => {
  const validColumns = ["patient", "date_created", "report_date"];
  const validDirections = ["ASC", "DESC"];

  // Validation check
  if (!validColumns.includes(columnName)) {
    columnName = "date_created";
  }
  if (!validDirections.includes(direction)) {
    direction = "DESC";
  }

  if (columnName === "patient") {
    return `ORDER BY ed.patient_name_last ${direction}, ed.patient_name_first ${direction}`;
  }

  // Default case for other columns
  return `ORDER BY ${columnName} ${direction}`;
};

const generateExtendedSortStatement = (
  columnName: string,
  direction: string,
) => {
  // Valid columns and directions
  const validColumns: { [key: string]: string } = {
    patient: "patient",
    date_created: "date_created",
    report_date: "encounter_start_date",
  };
  const validDirections = ["ASC", "DESC"];

  // Validation checks
  columnName = validColumns[columnName] ?? "date_created";
  if (!validDirections.includes(direction)) {
    direction = "DESC";
  }

  if (columnName === "patient") {
    return `ORDER BY ed.first_name ${direction}, ed.last_name ${direction}`;
  }

  // Default case for other columns
  return `ORDER BY ed.${columnName} ${direction}`;
};
