import {
  Kysely,
  ExpressionBuilder,
  OrderByExpression,
  SelectQueryBuilder,
  Transaction,
} from "kysely";

import { NO_CONDITIONS_REPORTED_OPTION } from "@/app/constants";
import { getDb } from "@/app/data/metadataDb/database";
import { getSql } from "@/app/data/metadataDb/dialects/common";
import { ecr_data, Core, User } from "@/app/data/metadataDb/types/core";
import { EcrDisplay, RelatedEcr } from "@/app/types";
import { DateRangePeriod } from "@/app/utils/date-utils";

import { audit } from "./auditLogService";
import { UserFacingError } from "./errorService";
import { formatDate, formatDateTime } from "./formatDateService";
import { getLoggedInUser } from "./loggedInUserService";

export interface MetadataModel {
  eicr_id: string;
  conditions: string[];
  rule_summaries: string[];
  related_ecrs: RelatedEcr[];
  date_created: Date;
  set_id: string | undefined;
  eicr_version_number: string | undefined;
  first_name: string | undefined;
  last_name: string | undefined;
  birth_date: Date | undefined;
  encounter_start_date: Date | undefined;
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
export const listEcrData = audit(
  "ecr",
  "query",
  async (
    {
      startIndex,
      itemsPerPage,
      sortColumn,
      sortDirection,
      filterDates,
      searchTerm,
      filterConditions,
    }: {
      startIndex: number;
      itemsPerPage: number;
      sortColumn: string;
      sortDirection: string;
      filterDates: DateRangePeriod;
      searchTerm?: string;
      filterConditions?: string[];
    },
    trx: Transaction<Core>,
  ): Promise<EcrDisplay[]> => {
    try {
      const ecrList = await executeSearchQuery(
        trx,
        startIndex,
        itemsPerPage,
        sortColumn,
        sortDirection,
        filterDates,
        searchTerm,
        filterConditions,
      );
      return processMetadata(ecrList);
    } catch (error: unknown) {
      const message = "Failed to query eCRs";
      console.error({ message, error });
      throw new UserFacingError(message);
    }
  },
);

const executeSearchQuery = async (
  db: Transaction<Core>,
  startIndex: number,
  itemsPerPage: number,
  sortColumn: string,
  sortDirection: string,
  filterDates: DateRangePeriod,
  searchTerm?: string,
  filterConditions?: string[],
) => {
  const user = await getLoggedInUser(db);
  const mainQuery = db.with("ecr_sets", (db) =>
    db
      .selectFrom("ecr_data")
      .$call((qb) => limitEcrDataToUser(user, qb))
      .select(({ eb }) => [
        "ecr_data.set_id",
        eb.fn
          .max(eb.cast<number>("ecr_data.eicr_version_number", "integer"))
          .as("max_version_number"),
      ])
      .groupBy(["ecr_data.set_id"])
      .where((eb) =>
        generateWhereStatement(
          eb,
          filterDates,
          searchTerm,
          filterConditions,
          user?.user_type === "admin",
        ),
      ),
  );

  const ecrQuery = mainQuery.with("ecrs", (db) =>
    db
      .selectFrom("ecr_sets")
      .leftJoin("ecr_data", (join) =>
        join
          .onRef("ecr_data.set_id", "=", "ecr_sets.set_id")
          .on("ecr_sets.max_version_number", "=", (eb) =>
            eb.cast<number>("ecr_data.eicr_version_number", "integer"),
          ),
      )
      .select([
        "ecr_data.eicr_id",
        "ecr_data.first_name",
        "ecr_data.last_name",
        "ecr_data.birth_date",
        "ecr_data.encounter_start_date",
        "ecr_data.date_created",
        "ecr_data.set_id",
        "ecr_data.eicr_version_number",
      ])
      .orderBy(generateSortStatement(sortColumn, sortDirection))
      .offset(startIndex)
      .fetch(itemsPerPage),
  );

  return await getMetaModelData(ecrQuery as unknown as Kysely<EcrsCte>);
};

const limitEcrDataToUser = (
  user: User | undefined,
  qb: SelectQueryBuilder<Core, "ecr_data", {}>,
) => {
  if (!user) return qb.where((eb) => falseStmt(eb));
  if (user.user_type === "admin") return qb;

  return qb
    .innerJoin(
      "ecr_rr_conditions",
      "ecr_data.eicr_id",
      "ecr_rr_conditions.eicr_id",
    )
    .innerJoin(
      "condition_reference",
      "condition_reference.code",
      "ecr_rr_conditions.condition_code",
    )
    .innerJoin(
      "program_area",
      "program_area.uuid",
      "condition_reference.program_area_uuid",
    )
    .innerJoin(
      "user_program_area",
      "user_program_area.program_area_uuid",
      "program_area.uuid",
    )
    .where("user_program_area.user_uuid", "=", user.uuid);
};

// The actual type of the CTE we create in both list fns is truly gnarly (and not exported)
// So we cast everything to a Kysely<EcrsCte> which has the same functionality and types we need.
// It's a bit gross, but it reduces the code repetition substantially
interface EcrsCte extends Core {
  ecrs: ecr_data;
  ecr_sets: { set_id: string; max_version_number: number };
}

// Helper to execute the main ecr fetching CTE and also join in the conditions
// and rule summary data. If this is ever a performance problem, we could likely
// push this into the DB. Array/string aggregation functions are a mess across the SQLs
// so this solution is a bit back to basics and lets JS handle the join (there's never much
// data returned)
const getMetaModelData = async (
  mainQuery: Kysely<EcrsCte>,
): Promise<MetadataModel[]> => {
  const rawEcrs: Omit<
    MetadataModel,
    "conditions" | "rule_summaries" | "related_ecrs"
  >[] = await mainQuery.selectFrom("ecrs").selectAll().execute();

  const conditions = await mainQuery
    .selectFrom("ecrs")
    .leftJoin("ecr_rr_conditions", "ecrs.eicr_id", "ecr_rr_conditions.eicr_id")
    .select(["ecrs.eicr_id", "ecr_rr_conditions.condition"])
    .distinct()
    .execute();

  const rule_summaries = await mainQuery
    .selectFrom("ecrs")
    .leftJoin("ecr_rr_conditions", "ecrs.eicr_id", "ecr_rr_conditions.eicr_id")
    .leftJoin(
      "ecr_rr_rule_summaries",
      "ecr_rr_conditions.uuid",
      "ecr_rr_rule_summaries.ecr_rr_conditions_id",
    )
    .select(["ecrs.eicr_id", "ecr_rr_rule_summaries.rule_summary"])
    .distinct()
    .execute();

  const related_ecrs = await mainQuery
    .selectFrom("ecr_sets")
    .innerJoin("ecr_data", "ecr_sets.set_id", "ecr_data.set_id")
    .select([
      "ecr_data.eicr_id",
      "ecr_data.set_id",
      "ecr_data.eicr_version_number",
      "ecr_data.date_created",
    ])
    .orderBy(["ecr_data.date_created desc"])
    .where((eb) =>
      eb(
        "ecr_sets.max_version_number",
        "!=",
        eb.cast<number>("ecr_data.eicr_version_number", "integer"),
      ),
    )
    .execute();

  const ecrs: MetadataModel[] = rawEcrs.map((ecr) => {
    return {
      ...ecr,
      conditions: conditions
        .filter(
          ({ eicr_id, condition }) => condition && eicr_id === ecr.eicr_id,
        )
        .map(({ condition }) => condition) as string[],
      rule_summaries: rule_summaries
        .filter(
          ({ eicr_id, rule_summary }) =>
            rule_summary && eicr_id === ecr.eicr_id,
        )
        .map(({ rule_summary }) => rule_summary) as string[],
      related_ecrs: related_ecrs.filter(({ set_id }) => set_id === ecr.set_id),
    };
  });

  return ecrs;
};

/**
 * Process the returned metadata into a displayable version
 * @param responseBody a returned row of data
 * @returns displayable ecr data
 */
export const processMetadata = (responseBody: MetadataModel[]) => {
  return responseBody.map((object) => {
    return {
      ecrId: object.eicr_id || "",
      reportable_conditions: object.conditions || [],
      rule_summaries: object.rule_summaries || [],
      date_created: object.date_created
        ? formatDateTime(object.date_created.toISOString())
        : "",
      eicr_set_id: object.set_id,
      eicr_version_number: object.eicr_version_number,
      related_ecrs: object.related_ecrs || [],
      patient_first_name: object.first_name || "",
      patient_last_name: object.last_name || "",
      patient_date_of_birth: object.birth_date
        ? formatDate(object.birth_date.toISOString())
        : "",
      patient_report_date: object.encounter_start_date
        ? formatDateTime(object.encounter_start_date.toISOString())
        : "",
    };
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
  const user = await getLoggedInUser();
  const result = await getDb<Core>()
    .selectFrom("ecr_data")
    .$call((qb) => limitEcrDataToUser(user, qb))
    .select((eb) => eb.fn.count("ecr_data.set_id").distinct().as("count"))
    .where((eb) =>
      generateWhereStatement(
        eb,
        filterDates,
        searchTerm,
        filterConditions,
        user?.user_type === "admin",
      ),
    )
    .executeTakeFirst();

  return Number(result?.count) || 0;
};

/**
 *  Generate where statement for SQL Server
 * @param eb expression builder
 * @param filterDates - The date (range) to filter on
 * @param searchTerm - Optional search term used to filter
 * @param filterConditions - Optional array of reportable conditions used to filter
 * @param isAdmin - The logged in user is an admin
 * @returns - expression wrapper for use in where
 */
export const generateWhereStatement = (
  eb: ExpressionBuilder<Core, "ecr_data">,
  filterDates: DateRangePeriod,
  searchTerm?: string,
  filterConditions?: string[],
  isAdmin: boolean = false,
) => {
  return generateSearchStatement(eb, searchTerm)
    .and(generateFilterDateStatement(eb, filterDates))
    .and(generateFilterConditionsStatement(eb, filterConditions, isAdmin));
};

/**
 * Generate the search statement
 * @param eb Kysely expression builder
 * @param searchTerm The term to filter by
 * @returns expression wrapper for use in where
 */
export const generateSearchStatement = (
  eb: ExpressionBuilder<Core, "ecr_data">,
  searchTerm?: string,
) => {
  if (!searchTerm) {
    return trueStmt(eb);
  }

  return eb.or([
    eb("ecr_data.first_name", getSql("like"), `%${searchTerm}%`),
    eb("ecr_data.last_name", getSql("like"), `%${searchTerm}%`),
  ]);
};

/**
 * A custom type format for statement filtering conditions
 * @param eb expression builder
 * @param filterConditions - Optional array of reportable conditions used to filter
 * @param isAdmin - The logged in user is an admin
 * @returns expression wrapper for use in where
 */
export const generateFilterConditionsStatement = (
  eb: ExpressionBuilder<Core, "ecr_data">,
  filterConditions?: string[] | undefined,
  isAdmin: boolean = false,
) => {
  if (!filterConditions) return trueStmt(eb);
  if (
    filterConditions.length === 0 ||
    filterConditions.every((condition) => condition === "")
  ) {
    return falseStmt(eb);
  }

  const includeNoConditions =
    isAdmin && filterConditions.includes(NO_CONDITIONS_REPORTED_OPTION);

  const actualConditions = filterConditions.filter(
    (condition) => condition !== NO_CONDITIONS_REPORTED_OPTION,
  );

  const queryConditions = [];

  if (includeNoConditions) {
    queryConditions.push(
      eb.not(
        eb.exists(
          eb
            .selectFrom("ecr_rr_conditions as erc_sub")
            .select("erc_sub.eicr_id")
            .where("erc_sub.eicr_id", "=", eb.ref("ecr_data.eicr_id")),
        ),
      ),
    );
  }

  if (actualConditions.length > 0) {
    queryConditions.push(
      eb.exists(
        eb
          .selectFrom("ecr_rr_conditions as erc_sub")
          .select("erc_sub.eicr_id")
          .whereRef("erc_sub.eicr_id", "=", "ecr_data.eicr_id")
          .where((subEb) =>
            subEb("erc_sub.condition", "is not", null).and(
              subEb.or(
                actualConditions.map((condition) =>
                  subEb("erc_sub.condition", getSql("like"), `%${condition}%`),
                ),
              ),
            ),
          ),
      ),
    );
  }
  // Single OR statement for all conditions
  return eb.or(queryConditions);
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
  eb: ExpressionBuilder<Core, "ecr_data">,
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
 * @returns custom type format object for use by kysely
 */
export const generateSortStatement = (
  columnName: string,
  direction: string,
): OrderByExpression<Core, "ecr_data", {}>[] => {
  // Valid columns and directions
  const validColumns: { [key: string]: string } = {
    patient: "patient",
    date_created: "date_created",
    encounter_date: "encounter_start_date",
  };
  const validDirections = ["ASC", "DESC"];

  // Validation checks
  columnName = validColumns[columnName] ?? "date_created";
  if (!validDirections.includes(direction)) {
    direction = "DESC";
  }
  direction = direction.toLowerCase();

  if (columnName === "patient") {
    return [
      `first_name ${direction}`,
      `last_name ${direction}`,
    ] as OrderByExpression<Core, "ecr_data", {}>[];
  }
  // Default case for other columns
  return [`${columnName} ${direction}`] as OrderByExpression<
    Core,
    "ecr_data",
    {}
  >[];
};

/**
 * Helper to get a statement that is always true and appeases the database syntax gods
 * @param eb expression builder
 * @returns a statement that will evaluate to true
 */
const trueStmt = (eb: ExpressionBuilder<Core, "ecr_data">) =>
  eb(eb.val(true), "=", true);

/**
 * Helper to get a statement that is always false and appeases the database syntax gods
 * @param eb expression builder
 * @returns a statement that will evaluate to false
 */
const falseStmt = (eb: ExpressionBuilder<Core, "ecr_data">) =>
  eb(eb.val(true), "=", false);
