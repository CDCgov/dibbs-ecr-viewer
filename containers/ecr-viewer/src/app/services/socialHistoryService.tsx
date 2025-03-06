import { Bundle, Observation } from "fhir/r4";

import { noData } from "@/app/utils/data-utils";
import { evaluateAll, evaluateValue } from "@/app/utils/evaluate";
import fhirPathMappings, {
  FhirPathKeys,
} from "@/app/utils/evaluate/fhir-paths";
import { ColumnInfoInput } from "@/app/view-data/components/EvaluateTable";
import { JsonTable } from "@/app/view-data/components/JsonTable";

import { formatDate } from "./formatDateService";
import { HtmlTableJsonRow } from "./htmlTableService";

type TravelHistoryColumn = ColumnInfoInput & { infoPath: FhirPathKeys };

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
      columns.forEach(({ columnName, infoPath, applyToValue }) => {
        let value = evaluateValue(activity, fhirPathMappings[infoPath]);

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
      return Object.values(row).some(({ value }) => value !== noData);
    });

  return tables;
};
