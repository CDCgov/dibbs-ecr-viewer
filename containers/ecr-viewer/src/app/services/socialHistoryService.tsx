import { Bundle, Observation } from "fhir/r4";

import { noData } from "@/app/utils/data-utils";
import { evaluateAll } from "@/app/utils/evaluate";
import fhirPathMappings from "@/app/utils/evaluate/fhir-paths";
import { toSentenceCase } from "@/app/utils/format-utils";
import EvaluateTable, {
  ColumnInfoInput,
  evaluateTableRowCell,
} from "@/app/view-data/components/EvaluateTable";
import { JsonTable } from "@/app/view-data/components/JsonTable";

import { formatDate, formatDateTime } from "./formatDateService";
import { HtmlTableJsonRow } from "./htmlTableService";

type TravelHistoryColumn = Omit<ColumnInfoInput, "applyToValue"> & {
  applyToValue?: (val: string) => string | undefined;
};

/**
 * Extracts travel history information from the provided FHIR bundle based on the FHIR path mappings.
 * @param fhirBundle - The FHIR bundle containing patient travel history data.
 * @returns - A formatted table representing the patient's travel history, or undefined if no relevant data is found.
 */
export const evaluateTravelHistoryTable = (fhirBundle: Bundle) => {
  const travelHistory = evaluateAll(
    fhirBundle,
    fhirPathMappings.patientTravelHistory,
  );

  const columns: TravelHistoryColumn[] = [
    {
      columnName: "Location",
      infoPath: "travelHistoryLocation",
    },
    {
      columnName: "Start Date",
      infoPath: "travelHistoryStartDate",
      applyToValue: formatDate,
    },
    {
      columnName: "End Date",
      infoPath: "travelHistoryEndDate",
      applyToValue: formatDate,
    },
    {
      columnName: "Purpose",
      infoPath: "travelHistoryPurpose",
    },
  ];

  const tables = createTravelHistoryTables(travelHistory, columns);

  if (!tables.length) return undefined;

  return (
    <JsonTable
      jsonTableData={{ tables: [tables], resultName: "Travel History" }}
      className="caption-data-title margin-y-0"
    />
  );
};

const createTravelHistoryTables = (
  history: Observation[],
  columns: TravelHistoryColumn[],
) => {
  const tables = history
    .map((activity) => {
      const row: HtmlTableJsonRow = {};

      // Populate the row by iterating over the columns
      columns.forEach((column) => {
        const value = evaluateTableRowCell(column, activity, fhirPathMappings);
        // casting is fine because of constrained applyToValue type
        const data = value.data as string | undefined;

        // Assign the value to the row
        row[column.columnName] = { value: data || noData };
      });

      return row;
    })
    .filter((row) => {
      // Filter out rows with only noData values
      return Object.values(row).some(({ value }) => value !== noData);
    });

  return tables;
};

/**
 * Returns a table displaying disability status survey observations.
 * @param bundle - The FHIR bundle containing disability status observation data.
 * @returns The JSX element representing the disabilit status table, or undefined if no disability status observations are found.
 */
export const returnDisabilityStatusTable = (
  bundle: Bundle,
): React.JSX.Element | undefined => {
  const disabilityObs = evaluateAll(
    bundle,
    fhirPathMappings.patientDisabilityStatus,
  );
  if (disabilityObs.length === 0) {
    return undefined;
  }

  const columnInfo: ColumnInfoInput[] = [
    {
      columnName: "HHS Disability Data Standard Survey",
      infoPath: "disabilityStatusQuestion",
      tooltipText:
        "These questions are used on the American Community Survey (ACS) to measure disability, and were developed by a federal interagency committee.",
    },
    {
      columnName: "Status",
      infoPath: "disabilityStatusValue",
      applyToValue: toSentenceCase,
    },
    {
      columnName: "Dates",
      infoPath: "disabilityStatusDate",
      applyToValue: formatDateTime,
    },
  ];

  return (
    <EvaluateTable
      resources={disabilityObs}
      columns={columnInfo}
      className="margin-y-1"
      fixed={false}
    />
  );
};
