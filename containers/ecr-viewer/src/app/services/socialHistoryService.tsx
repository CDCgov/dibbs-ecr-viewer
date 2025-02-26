import { Bundle, Observation } from "fhir/r4";
import { PathMappings, noData } from "../utils/data-utils";

import { evaluate } from "../utils/evaluate";
import { evaluateValue } from "./evaluateFhirDataService";
import { JsonTable } from "../view-data/components/JsonTable";
import { formatDate } from "./formatDateService";
import { HtmlTableJsonRow } from "./htmlTableService";

interface TravelHistoryColumn {
  columnName: string;
  infoPath: string;
  applyToValue?: (dateTime?: string) => string | undefined;
}

/**
 * Extracts travel history information from the provided FHIR bundle based on the FHIR path mappings.
 * @param fhirBundle - The FHIR bundle containing patient travel history data.
 * @param mappings - An object containing the FHIR path mappings.
 * @returns - A formatted table representing the patient's travel history, or undefined if no relevant data is found.
 */
export const evaluateTravelHistoryTable = (
  fhirBundle: Bundle,
  mappings: PathMappings,
) => {
  const travelHistory: Observation[] = evaluate(
    fhirBundle,
    mappings.patientTravelHistory,
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

  const tables = createTravelHistoryTables(travelHistory, columns, mappings);

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
  mappings: PathMappings,
) => {
  const tables = history
    .map((activity) => {
      const row: HtmlTableJsonRow = {};

      // Populate the row by iterating over the columns
      columns.forEach(({ columnName, infoPath, applyToValue }) => {
        let value = evaluateValue(activity, mappings[infoPath]);

        // Apply transformation if needed
        if (applyToValue) {
          value = applyToValue(value) ?? "";
        }

        // Assign the value to the row
        row[columnName] = { value: value || noData };
      });

      return row;
    })
    .filter((row) => {
      // Filter out rows with only noData values
      return Object.values(row).some((column) => {
        const columnValue = column.value;
        return columnValue !== noData;
      });
    });

  return tables;
};
