import { Bundle, Observation } from "fhir/r4";
import { PathMappings, noData } from "../utils/data-utils";

import { evaluate } from "../utils/evaluate";
import { evaluateValue } from "./evaluateFhirDataService";
import { returnTableFromJson } from "../view-data/components/common";
import { formatDate } from "./formatDateService";
import { TableRow } from "./htmlTableService";

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

  const columnInfo = [
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

  const tables = travelHistory
    .map((act) => {
      return columnInfo.reduce(
        (row, { columnName, infoPath, applyToValue }) => {
          let val = evaluateValue(act, mappings[infoPath]);
          if (applyToValue) {
            val = applyToValue(val) ?? "";
          }
          return { ...row, [columnName]: { value: val || noData } };
        },
        {} as TableRow[],
      );
    })
    .filter((row) =>
      Object.values(row).some((v) => (v.value as any) !== noData),
    );

  return returnTableFromJson(
    { tables, resultName: "Travel History" },
    true,
    "caption-data-title margin-y-0",
  );
};
