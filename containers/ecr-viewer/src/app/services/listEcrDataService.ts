import { formatDate, formatDateTime } from "@/app/services/formatService";
import { get_pool } from "../api/services/sqlserver_db";
import { getDB } from "../api/services/postgres_db";
import { DateRangePeriod } from "@/app/view-data/utils/date-utils";

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
}

export interface ExtendedMetadataModel {
  eICR_ID: string;
  data_source: "DB" | "S3";
  data_link: string;
  first_name: string;
  last_name: string;
  birth_date: Date;
  conditions: string;
  rule_summaries: string;
  encounter_start_date: Date;
  date_created: Date;
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
  const DATABASE_TYPE = process.env.METADATA_DATABASE_TYPE;

  switch (DATABASE_TYPE) {
    case "postgres":
      return listEcrDataPostgres(
        startIndex,
        itemsPerPage,
        sortColumn,
        sortDirection,
        filterDates,
        searchTerm,
        filterConditions,
      );
    case "sqlserver":
      return listEcrDataSqlserver(
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

async function listEcrDataPostgres(
  startIndex: number,
  itemsPerPage: number,
  sortColumn: string,
  sortDirection: string,
  filterDates: DateRangePeriod,
  searchTerm?: string,
  filterConditions?: string[],
): Promise<EcrDisplay[]> {
  const { database } = getDB();
  const list = await database.manyOrNone<CoreMetadataModel>(
    "SELECT ed.eICR_ID, ed.patient_name_first, ed.patient_name_last, ed.patient_birth_date, ed.date_created, ed.report_date, ed.report_date,  ARRAY_AGG(DISTINCT erc.condition) AS conditions, ARRAY_AGG(DISTINCT ers.rule_summary) AS rule_summaries FROM ecr_data ed LEFT JOIN ecr_rr_conditions erc ON ed.eICR_ID = erc.eICR_ID LEFT JOIN ecr_rr_rule_summaries ers ON erc.uuid = ers.ecr_rr_conditions_id WHERE $[whereClause] GROUP BY ed.eICR_ID, ed.patient_name_first, ed.patient_name_last, ed.patient_birth_date, ed.date_created, ed.report_date $[sortStatement] OFFSET $[startIndex] ROWS FETCH NEXT $[itemsPerPage] ROWS ONLY",
    {
      whereClause: generateWhereStatementPostgres(
        filterDates,
        searchTerm,
        filterConditions,
      ),
      startIndex,
      itemsPerPage,
      sortStatement: generateSortStatement(sortColumn, sortDirection),
    },
  );

  return processCoreMetadata(list);
}

async function listEcrDataSqlserver(
  startIndex: number,
  itemsPerPage: number,
  sortColumn: string,
  sortDirection: string,
  filterDates: DateRangePeriod,
  searchTerm?: string,
  filterConditions?: string[],
): Promise<EcrDisplay[]> {
  let pool = await get_pool();

  try {
    const conditionsSubQuery =
      "SELECT STRING_AGG([condition], ',') FROM (SELECT DISTINCT erc.[condition] FROM ecr_rr_conditions AS erc WHERE erc.eICR_ID = ed.eICR_ID) AS distinct_conditions";
    const ruleSummariesSubQuery =
      "SELECT STRING_AGG(rule_summary, ',') FROM (SELECT DISTINCT ers.rule_summary FROM ecr_rr_rule_summaries AS ers LEFT JOIN ecr_rr_conditions as erc ON ers.ecr_rr_conditions_id = erc.uuid WHERE erc.eICR_ID = ed.eICR_ID) AS distinct_rule_summaries";
    const sortStatement = generateSqlServerSortStatement(
      sortColumn,
      sortDirection,
    );
    const whereStatement = generateWhereStatementSqlServer(
      filterDates,
      searchTerm,
      filterConditions,
    );
    const query = `SELECT ed.eICR_ID, ed.first_name, ed.last_name, ed.birth_date, ed.encounter_start_date, ed.date_created, (${conditionsSubQuery}) AS conditions, (${ruleSummariesSubQuery}) AS rule_summaries FROM ecr_data ed LEFT JOIN ecr_rr_conditions erc ON ed.eICR_ID = erc.eICR_ID LEFT JOIN ecr_rr_rule_summaries ers ON erc.uuid = ers.ecr_rr_conditions_id WHERE ${whereStatement} GROUP BY ed.eICR_ID, ed.first_name, ed.last_name, ed.birth_date, ed.encounter_start_date, ed.date_created ${sortStatement} OFFSET ${startIndex} ROWS FETCH NEXT ${itemsPerPage} ROWS ONLY`;
    const list = await pool.request().query<ExtendedMetadataModel[]>(query);

    return processExtendedMetadata(list.recordset);
  } catch (error: any) {
    console.error(error);
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
      ecrId: object.eICR_ID || "",
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
  const DATABASE_TYPE = process.env.METADATA_DATABASE_TYPE;

  switch (DATABASE_TYPE) {
    case "postgres":
      return getTotalEcrCountPostgres(
        filterDates,
        searchTerm,
        filterConditions,
      );
    case "sqlserver":
      return getTotalEcrCountSqlServer(
        filterDates,
        searchTerm,
        filterConditions,
      );
    default:
      throw new Error("Unsupported database type");
  }
};

const getTotalEcrCountPostgres = async (
  filterDates: DateRangePeriod,
  searchTerm?: string,
  filterConditions?: string[],
): Promise<number> => {
  const { database } = getDB();
  let number = await database.one(
    "SELECT count(DISTINCT ed.eICR_ID) FROM ecr_data as ed LEFT JOIN ecr_rr_conditions erc on ed.eICR_ID = erc.eICR_ID WHERE $[whereClause]",
    {
      whereClause: generateWhereStatementPostgres(
        filterDates,
        searchTerm,
        filterConditions,
      ),
    },
  );
  return number.count;
};

const getTotalEcrCountSqlServer = async (
  filterDates: DateRangePeriod,
  searchTerm?: string,
  filterConditions?: string[],
): Promise<number> => {
  let pool = await get_pool();

  try {
    const whereStatement = generateWhereStatementSqlServer(
      filterDates,
      searchTerm,
      filterConditions,
    );

    let query = `SELECT COUNT(DISTINCT ed.eICR_ID) as count FROM ecr_data ed LEFT JOIN ecr_rr_conditions erc ON ed.eICR_ID = erc.eICR_ID WHERE ${whereStatement}`;

    const count = await pool.request().query<{ count: number }>(query);

    return count.recordset[0].count;
  } catch (error: any) {
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
export const generateWhereStatementPostgres = (
  filterDates: DateRangePeriod,
  searchTerm?: string,
  filterConditions?: string[],
) => ({
  rawType: true,
  toPostgres: () => {
    const statementSearch = generateSearchStatement(searchTerm).toPostgres();
    const statementConditions = filterConditions
      ? generateFilterConditionsStatement(filterConditions).toPostgres()
      : "NULL IS NULL";
    const statementDate =
      generateFilterDateStatementPostgres(filterDates).toPostgres();

    return `(${statementSearch}) AND (${statementDate}) AND (${statementConditions})`;
  },
});

/**
 *  Generate where statement for SQL Server
 * @param filterDates - The date (range) to filter on
 * @param searchTerm - Optional search term used to filter
 * @param filterConditions - Optional array of reportable conditions used to filter
 * @returns - where statement for SQL Server
 */
const generateWhereStatementSqlServer = (
  filterDates: DateRangePeriod,
  searchTerm?: string,
  filterConditions?: string[],
) => {
  const statementSearch = generateSearchStatementSqlServer(searchTerm);
  const statementConditions = filterConditions
    ? generateFilterConditionsStatementSqlServer(filterConditions)
    : "NULL IS NULL";
  const statementDate = generateFilterDateStatementSqlServer(filterDates);

  return `(${statementSearch}) AND (${statementDate}) AND (${statementConditions})`;
};

/**
 * A custom type format for search statement
 * @param searchTerm - Optional search term used to filter
 * @returns custom type format object for use by pg-promise
 */
export const generateSearchStatement = (searchTerm?: string) => ({
  rawType: true,
  toPostgres: () => {
    const { pgPromise } = getDB();
    const searchFields = ["ed.patient_name_first", "ed.patient_name_last"];
    return searchFields
      .map((field) => {
        if (!searchTerm) {
          return pgPromise.as.format("NULL IS NULL");
        }
        return pgPromise.as.format("$[field:raw] ILIKE $[searchTerm]", {
          searchTerm: `%${searchTerm}%`,
          field,
        });
      })
      .join(" OR ");
  },
});

const generateSearchStatementSqlServer = (searchTerm?: string) => {
  const searchFields = ["ed.first_name", "ed.last_name"];
  return searchFields
    .map((field) => {
      if (!searchTerm) {
        return "NULL IS NULL";
      }
      return `${field} LIKE '%${searchTerm}%'`;
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
) => ({
  rawType: true,
  toPostgres: () => {
    const { pgPromise } = getDB();
    if (
      Array.isArray(filterConditions) &&
      filterConditions.every((item) => item === "")
    ) {
      const subQuery = `SELECT DISTINCT erc_sub.eICR_ID FROM ecr_rr_conditions erc_sub WHERE erc_sub.condition IS NOT NULL`;
      return `ed.eICR_ID NOT IN (${subQuery})`;
    }

    const whereStatement = filterConditions
      .map((condition) => {
        return pgPromise.as.format("erc_sub.condition ILIKE $[condition]", {
          condition: `%${condition}%`,
        });
      })
      .join(" OR ");
    const subQuery = `SELECT DISTINCT ed_sub.eICR_ID FROM ecr_data ed_sub LEFT JOIN ecr_rr_conditions erc_sub ON ed_sub.eICR_ID = erc_sub.eICR_ID WHERE erc_sub.condition IS NOT NULL AND (${whereStatement})`;
    return `ed.eICR_ID IN (${subQuery})`;
  },
});

const generateFilterConditionsStatementSqlServer = (
  filterConditions: string[],
) => {
  if (
    Array.isArray(filterConditions) &&
    filterConditions.every((item) => item === "")
  ) {
    const subQuery = `SELECT DISTINCT erc_sub.eICR_ID FROM ecr_rr_conditions erc_sub WHERE erc_sub.condition IS NOT NULL`;
    return `ed.eICR_ID NOT IN (${subQuery})`;
  }

  const whereStatement = filterConditions
    .map((condition) => {
      return `erc_sub.condition LIKE '${condition}'`;
    })
    .join(" OR ");
  const subQuery = `SELECT DISTINCT ed_sub.eICR_ID FROM ecr_data ed_sub LEFT JOIN ecr_rr_conditions erc_sub ON ed_sub.eICR_ID = erc_sub.eICR_ID WHERE erc_sub.condition IS NOT NULL AND (${whereStatement})`;
  return `ed.eICR_ID IN (${subQuery})`;
};

/**
 * A custom type format for statement filtering by date range
 * @param props - The props representing the date range to filter on
 * @param props.startDate - Start date of date range
 * @param props.endDate - End date of date range
 * @returns custom type format object for use by pg-promise
 */
export const generateFilterDateStatementPostgres = ({
  startDate,
  endDate,
}: DateRangePeriod) => ({
  rawType: true,
  toPostgres: () => {
    const { pgPromise } = getDB();

    return [
      pgPromise.as.format("ed.date_created >= $[startDate]", {
        startDate: startDate,
      }),
      pgPromise.as.format("ed.date_created <= $[endDate]", {
        endDate: endDate,
      }),
    ].join(" AND ");
  },
});

const generateFilterDateStatementSqlServer = ({
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
export const generateSortStatement = (
  columnName: string,
  direction: string,
) => ({
  rawType: true,
  toPostgres: () => {
    const { pgPromise } = getDB();
    // Valid columns and directions
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
      return pgPromise.as.format(
        `ORDER BY ed.patient_name_last ${direction}, ed.patient_name_first ${direction}`,
        { direction },
      );
    }

    // Default case for other columns
    return pgPromise.as.format(`ORDER BY $[columnName:raw] ${direction}`, {
      columnName,
    });
  },
});

const generateSqlServerSortStatement = (
  columnName: string,
  direction: string,
) => {
  // Valid columns and directions
  const validColumns = {
    patient: "patient",
    date_created: "date_created",
    report_date: "encounter_start_date",
  };
  const validDirections = ["ASC", "DESC"];

  // Validation checks
  columnName = (validColumns as any)[columnName] ?? "date_created";
  if (!validDirections.includes(direction)) {
    direction = "DESC";
  }

  if (columnName === "patient") {
    return `ORDER BY ed.first_name ${direction}, ed.last_name ${direction}`;
  }

  // Default case for other columns
  return `ORDER BY ed.${columnName} ${direction}`;
};
