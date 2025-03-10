import { sql } from "kysely";

import { db } from "@/app/api/services/database";
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
  data_source: "DB" | "S3";
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
  startIndex: number,
  itemsPerPage: number,
  sortColumn: string,
  sortDirection: string,
  filterDates: DateRangePeriod,
  searchTerm?: string,
  filterConditions?: string[],
): Promise<EcrDisplay[]> {
  const whereClause = generateCoreWhereStatement(
    filterDates,
    searchTerm,
    filterConditions,
  );
  const sortStatement = generateCoreSortStatement(sortColumn, sortDirection);
  const queryString = `SELECT ed.eICR_ID, ed.patient_name_first, ed.patient_name_last, ed.patient_birth_date, ed.date_created, ed.report_date, ed.report_date, ed.set_id, ed.eicr_version_number,  ARRAY_AGG(DISTINCT erc.condition) AS conditions, ARRAY_AGG(DISTINCT ers.rule_summary) AS rule_summaries FROM ecr_viewer.ecr_data ed LEFT JOIN ecr_viewer.ecr_rr_conditions erc ON ed.eICR_ID = erc.eICR_ID LEFT JOIN ecr_viewer.ecr_rr_rule_summaries ers ON erc.uuid = ers.ecr_rr_conditions_id WHERE ${whereClause} GROUP BY ed.eICR_ID, ed.patient_name_first, ed.patient_name_last, ed.patient_birth_date, ed.date_created, ed.report_date, ed.set_id, ed.eicr_version_number ${sortStatement} OFFSET ${startIndex.toString()} ROWS FETCH NEXT ${itemsPerPage.toString()} ROWS ONLY`;
  const result = await sql.raw<CoreMetadataModel>(queryString).execute(db);
  const list = result.rows;
  return processCoreMetadata(list);
}

async function listExtendedEcrData(
  startIndex: number,
  itemsPerPage: number,
  sortColumn: string,
  sortDirection: string,
  filterDates: DateRangePeriod,
  searchTerm?: string,
  filterConditions?: string[],
): Promise<EcrDisplay[]> {
  try {
    const conditionsSubQuery =
      "SELECT STRING_AGG(condition, ',') FROM (SELECT DISTINCT erc.condition FROM ecr_viewer.ecr_rr_conditions AS erc WHERE erc.eICR_ID = ed.eICR_ID) AS distinct_conditions";
    const ruleSummariesSubQuery =
      "SELECT STRING_AGG(rule_summary, ',') FROM (SELECT DISTINCT ers.rule_summary FROM ecr_viewer.ecr_rr_rule_summaries AS ers LEFT JOIN ecr_viewer.ecr_rr_conditions as erc ON ers.ecr_rr_conditions_id = erc.uuid WHERE erc.eICR_ID = ed.eICR_ID) AS distinct_rule_summaries";
    const sortStatement = generateExtendedSortStatement(
      sortColumn,
      sortDirection,
    );
    const whereStatement = generateExtendedWhereStatement(
      filterDates,
      searchTerm,
      filterConditions,
    );

    const queryString = `SELECT ed.eICR_ID, ed.first_name, ed.last_name, ed.birth_date, ed.encounter_start_date, ed.date_created, ed.set_id, ed.eicr_version_number, (${conditionsSubQuery}) AS conditions, (${ruleSummariesSubQuery}) AS rule_summaries FROM ecr_viewer.ecr_data ed LEFT JOIN ecr_viewer.ecr_rr_conditions erc ON ed.eICR_ID = erc.eICR_ID LEFT JOIN ecr_viewer.ecr_rr_rule_summaries ers ON erc.uuid = ers.ecr_rr_conditions_id WHERE ${whereStatement} GROUP BY ed.eICR_ID, ed.first_name, ed.last_name, ed.birth_date, ed.encounter_start_date, ed.date_created, ed.set_id, ed.eicr_version_number ${sortStatement} OFFSET ${startIndex.toString()} ROWS FETCH NEXT ${itemsPerPage.toString()} ROWS ONLY`;
    const result = await sql
      .raw<ExtendedMetadataModel>(queryString)
      .execute(db);
    const list = result.rows;
    return processExtendedMetadata(list);
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
  const result = await sql.raw<{ count: string }>(query).execute(db);
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
    const result = await sql.raw<{ count: string }>(query).execute(db);
    return parseInt(result.rows[0].count);
  } catch (error: unknown) {
    console.error(error);
    return Promise.reject(error);
  }
};

/**
 * A custom type format for where statement
 * @param filterDates - The date (range) to filter on
 * @param searchTerm - Optional search term used to filter
 * @param filterConditions - Optional array of reportable conditions used to filter
 * @returns custom type format object for use by pg-promise
 */
export const generateCoreWhereStatement = (
  filterDates: DateRangePeriod,
  searchTerm?: string,
  filterConditions?: string[],
) => {
  const statementSearch = generateCoreSearchStatement(searchTerm);
  const statementConditions = filterConditions
    ? generateFilterConditionsStatement(filterConditions)
    : "NULL IS NULL";
  const statementDate = generateFilterDateStatement(filterDates);

  return `(${statementSearch}) AND (${statementDate}) AND (${statementConditions})`;
};

/**
 *  Generate where statement for SQL Server
 * @param filterDates - The date (range) to filter on
 * @param searchTerm - Optional search term used to filter
 * @param filterConditions - Optional array of reportable conditions used to filter
 * @returns - where statement for SQL Server
 */
const generateExtendedWhereStatement = (
  filterDates: DateRangePeriod,
  searchTerm?: string,
  filterConditions?: string[],
) => {
  const statementSearch = generateExtendedSearchStatement(searchTerm);
  const statementConditions = filterConditions
    ? generateFilterConditionsStatementSqlServer(filterConditions)
    : "NULL IS NULL";
  const statementDate = generateFilterDateStatement(filterDates);

  return `(${statementSearch}) AND (${statementDate}) AND (${statementConditions})`;
};

/**
 * A custom type format for search statement
 * @param searchTerm - Optional search term used to filter
 * @returns custom type format object for use by pg-promise
 */
export const generateCoreSearchStatement = (searchTerm?: string) => {
  const searchFields = ["ed.patient_name_first", "ed.patient_name_last"];
  return searchFields
    .map((field) => {
      if (!searchTerm) {
        return `NULL IS NULL`;
      }
      const escapedSearchTerm = searchTerm.replace(/'/g, "''");
      return `${field} ILIKE '%${escapedSearchTerm}%'`;
    })
    .join(" OR ");
};

const generateExtendedSearchStatement = (searchTerm?: string) => {
  const searchFields = ["ed.first_name", "ed.last_name"];
  return searchFields
    .map((field) => {
      if (!searchTerm) {
        return "NULL IS NULL";
      }
      const escapedSearchTerm = searchTerm.replace(/'/g, "''");
      return `${field} LIKE '%${escapedSearchTerm}%'`;
    })
    .join(" OR ");
};

/**
 * A custom type format for statement filtering conditions
 * @param filterConditions - Optional array of reportable conditions used to filter
 * @returns custom type format object for use by pg-promise
 */
export const generateFilterConditionsStatement = (
  filterConditions: string[],
) => {
  if (
    Array.isArray(filterConditions) &&
    filterConditions.every((item) => item === "")
  ) {
    const subQuery = `SELECT DISTINCT erc_sub.eICR_ID FROM ecr_viewer.ecr_rr_conditions erc_sub WHERE erc_sub.condition IS NOT NULL`;
    return `ed.eICR_ID NOT IN (${subQuery})`;
  }

  const whereStatement = filterConditions
    .map((condition) => {
      return `erc_sub.condition ILIKE '%${condition}%'`;
    })
    .join(" OR ");
  const subQuery = `SELECT DISTINCT ed_sub.eICR_ID FROM ecr_viewer.ecr_data ed_sub LEFT JOIN ecr_viewer.ecr_rr_conditions erc_sub ON ed_sub.eICR_ID = erc_sub.eICR_ID WHERE erc_sub.condition IS NOT NULL AND (${whereStatement})`;
  return `ed.eICR_ID IN (${subQuery})`;
};

const generateFilterConditionsStatementSqlServer = (
  filterConditions: string[],
) => {
  if (
    Array.isArray(filterConditions) &&
    filterConditions.every((item) => item === "")
  ) {
    const subQuery = `SELECT DISTINCT erc_sub.eICR_ID FROM ecr_viewer.ecr_rr_conditions erc_sub WHERE erc_sub.condition IS NOT NULL`;
    return `ed.eICR_ID NOT IN (${subQuery})`;
  }

  const whereStatement = filterConditions
    .map((condition) => {
      return `erc_sub.condition LIKE '${condition}'`;
    })
    .join(" OR ");
  const subQuery = `SELECT DISTINCT ed_sub.eICR_ID FROM ecr_viewer.ecr_data ed_sub LEFT JOIN ecr_viewer.ecr_rr_conditions erc_sub ON ed_sub.eICR_ID = erc_sub.eICR_ID WHERE erc_sub.condition IS NOT NULL AND (${whereStatement})`;
  return `ed.eICR_ID IN (${subQuery})`;
};

/**
 * A custom type format for statement filtering by date range
 * @param props - The props representing the date range to filter on
 * @param props.startDate - Start date of date range
 * @param props.endDate - End date of date range
 * @returns custom type format object for use by pg-promise
 */
export const generateFilterDateStatement = ({
  startDate,
  endDate,
}: DateRangePeriod) => {
  return [
    `ed.date_created >= '${startDate.toISOString()}'`,
    `ed.date_created <= '${endDate.toISOString()}'`,
  ].join(" AND ");
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
