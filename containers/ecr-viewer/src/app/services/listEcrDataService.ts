import { Kysely, ExpressionBuilder, sql } from "kysely";

import { Core } from "@/app/api/services/core_types";
import { db } from "@/app/api/services/database";
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
  data_link: string | undefined;
  first_name: string | undefined;
  last_name: string | undefined;
  birth_date: Date | undefined;
  conditions: string;
  rule_summaries: string;
  encounter_start_date: Date | undefined;
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
        db as Kysely<Core>,
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
        db as Kysely<Extended>,
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
      .selectFrom("ecr_data")
      .leftJoin(
        "ecr_rr_conditions",
        "ecr_data.eICR_ID",
        "ecr_rr_conditions.eICR_ID",
      )
      .leftJoin(
        "ecr_rr_rule_summaries",
        "ecr_rr_conditions.uuid",
        "ecr_rr_rule_summaries.ecr_rr_conditions_id",
      )
      .select([
        "ecr_data.eICR_ID as eicr_id",
        "ecr_data.patient_name_first",
        "ecr_data.patient_name_last",
        "ecr_data.patient_birth_date",
        "ecr_data.date_created",
        "ecr_data.report_date",
        "ecr_data.set_id",
        "ecr_data.data_source",
        "ecr_data.fhir_reference_link as data_link",
        "ecr_data.eicr_version_number",
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
        "ecr_data.eICR_ID",
        "ecr_data.patient_name_first",
        "ecr_data.patient_name_last",
        "ecr_data.patient_birth_date",
        "ecr_data.date_created",
        "ecr_data.report_date",
        "ecr_data.set_id",
        "ecr_data.data_source",
        "ecr_data.fhir_reference_link",
        "ecr_data.eicr_version_number",
      ])
      .orderBy(
        sql.ref(sortColumn),
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
 * list extended ecr daata
 * @param db database object
 * @param startIndex start page
 * @param itemsPerPage items per page
 * @param sortColumn column to sort by
 * @param sortDirection direction to sort
 * @param filterDates date rante
 * @param searchTerm search term
 * @param filterConditions conditions to filter by
 * @returns ecr display data
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
      .selectFrom("ecr_data")
      .leftJoin(
        "ecr_rr_conditions",
        "ecr_data.eICR_ID",
        "ecr_rr_conditions.eICR_ID",
      )
      .leftJoin(
        "ecr_rr_rule_summaries",
        "ecr_rr_conditions.uuid",
        "ecr_rr_rule_summaries.ecr_rr_conditions_id",
      )
      .select([
        "ecr_data.eICR_ID as eicr_id",
        "ecr_data.first_name",
        "ecr_data.last_name",
        "ecr_data.birth_date",
        "ecr_data.encounter_start_date",
        "ecr_data.date_created",
        "ecr_data.set_id",
        "ecr_data.eicr_version_number",
        "ecr_data.fhir_reference_link as data_link",
        sql<string>`ARRAY_AGG(DISTINCT erc.condition)`.as("conditions"),
        sql<string>`ARRAY_AGG(DISTINCT ers.rule_summary)`.as("rule_summaries"),
      ])
      .where((eb) =>
        generateExtendedWhereStatement(
          eb,
          filterDates,
          searchTerm,
          filterConditions,
        ),
      )
      .groupBy([
        "ecr_data.eICR_ID",
        "ecr_data.first_name",
        "ecr_data.last_name",
        "ecr_data.birth_date",
        "ecr_data.encounter_start_date",
        "ecr_data.date_created",
        "ecr_data.set_id",
        "ecr_data.fhir_reference_link",
        "ecr_data.eicr_version_number",
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
  const result = await (db as Kysely<Core>)
    .selectFrom("ecr_data")
    .leftJoin(
      "ecr_rr_conditions",
      "ecr_data.eICR_ID",
      "ecr_rr_conditions.eICR_ID",
    )
    .select((eb) =>
      eb.fn.count<number>("ecr_data.eICR_ID").distinct().as("count"),
    )
    .where((eb) =>
      generateCoreWhereStatement(eb, filterDates, searchTerm, filterConditions),
    )
    .executeTakeFirst();

  return result?.count ?? 0;
};

const getTotalExtendedEcrCount = async (
  filterDates: DateRangePeriod,
  searchTerm?: string,
  filterConditions?: string[],
): Promise<number> => {
  const result = await (db as Kysely<Extended>)
    .selectFrom("ecr_data")
    .leftJoin(
      "ecr_rr_conditions",
      "ecr_data.eICR_ID",
      "ecr_rr_conditions.eICR_ID",
    )
    .select((eb) =>
      eb.fn.count<number>("ecr_data.eICR_ID").distinct().as("count"),
    )
    .where((eb) =>
      generateExtendedWhereStatement(
        eb,
        filterDates,
        searchTerm,
        filterConditions,
      ),
    )
    .executeTakeFirst();

  return result?.count ?? 0;
};

/**
 * A custom type format for where statement
 * @param eb expression builder
 * @param filterDates - The date (range) to filter on
 * @param searchTerm - Optional search term used to filter
 * @param filterConditions - Optional array of reportable conditions used to filter
 * @returns custom type format object for use by pg-promise
 */
export const generateCoreWhereStatement = (
  eb: ExpressionBuilder<Core, "ecr_data">,
  filterDates: DateRangePeriod,
  searchTerm?: string,
  filterConditions?: string[],
) => {
  return generateCoreSearchStatement(eb, searchTerm)
    .and(generateFilterDateStatement(eb, filterDates))
    .and(generateFilterConditionsStatement(eb, filterConditions));
};

/**
 *  Generate where statement for SQL Server
 * @param eb expression builder
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
  return generateExtendedSearchStatement(eb, searchTerm)
    .and(generateFilterDateStatement(eb, filterDates))
    .and(generateFilterConditionsStatementSqlServer(eb, filterConditions));
};

/**
 * A custom type format for search statement
 * @param eb expression builder
 * @param searchTerm - Optional search term used to filter
 * @returns custom type format object for use by pg-promise
 */
export const generateCoreSearchStatement = (
  eb: ExpressionBuilder<Core, "ecr_data">,
  searchTerm?: string,
) => {
  if (!searchTerm) return eb.val(true); // No filtering needed

  return eb.or([
    eb("ecr_data.patient_name_first", "ilike", `%${searchTerm}%`),
    eb("ecr_data.patient_name_last", "ilike", `%${searchTerm}%`),
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
    eb("ecr_data.first_name", "ilike", `%${searchTerm}%`),
    eb("ecr_data.last_name", "ilike", `%${searchTerm}%`),
  ]);
};

/**
 * A custom type format for statement filtering conditions
 * @param eb expression builder
 * @param filterConditions - Optional array of reportable conditions used to filter
 * @returns custom type format object for use by pg-promise
 */
export const generateFilterConditionsStatement = (
  eb: ExpressionBuilder<Core, "ecr_data">,
  filterConditions?: string[] | undefined,
) => {
  if (!filterConditions || filterConditions.length === 0) return eb.val(true);

  return eb.exists(
    eb
      .selectFrom("ecr_rr_conditions as erc_sub")
      .select("erc_sub.eICR_ID")
      .whereRef("erc_sub.eICR_ID", "=", "ecr_data.eICR_ID")
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
  eb: ExpressionBuilder<Extended, "ecr_data" | "ecr_rr_conditions">,
  filterConditions: string[] | undefined,
) => {
  if (filterConditions === undefined) {
    return eb.val(true);
  }
  if (filterConditions.every((item) => item === "")) {
    return eb("ecr_data.eICR_ID", "not in", (subQb) =>
      subQb
        .selectFrom("ecr_rr_conditions as erc_sub")
        .select("erc_sub.eICR_ID")
        .where("erc_sub.condition", "is not", null),
    );
  }

  return eb("ecr_data.eICR_ID", "in", (subQb) =>
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
 * @param eb expression builder
 * @param range date range
 * @param range.startDate start
 * @param range.endDate end
 * @returns expression builder with date filters included
 */
export const generateFilterDateStatement = (
  eb: ExpressionBuilder<Core | Extended, "ecr_data">,
  { startDate, endDate }: DateRangePeriod,
) => {
  return eb.and([
    eb("ecr_data.date_created", ">=", startDate),
    eb("ecr_data.date_created", "<=", endDate),
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

// TODO PR: is this needed anywhere?
// const generateExtendedSortStatement = (
//   columnName: string,
//   direction: string,
// ) => {
//   // Valid columns and directions
//   const validColumns: { [key: string]: string } = {
//     patient: "patient",
//     date_created: "date_created",
//     report_date: "encounter_start_date",
//   };
//   const validDirections = ["ASC", "DESC"];

//   // Validation checks
//   columnName = validColumns[columnName] ?? "date_created";
//   if (!validDirections.includes(direction)) {
//     direction = "DESC";
//   }

//   if (columnName === "patient") {
//     return `ORDER BY ed.first_name ${direction}, ed.last_name ${direction}`;
//   }

//   // Default case for other columns
//   return `ORDER BY ed.${columnName} ${direction}`;
// };
