import classNames from "classnames";
import {
  Bundle,
  Coding,
  Condition,
  Immunization,
  Organization,
  Reference,
} from "fhir/r4";

import { calculatePatientAge } from "@/app/services/evaluateFhirDataService";
import { formatDateTime } from "@/app/services/formatDateService";
import { safeParse } from "@/app/utils/data-utils";
import { evaluateReference } from "@/app/utils/evaluate";

import EvaluateTable, { ColumnInfoInput } from "./EvaluateTable";

type ModifiedImmunization = Omit<Immunization, "manufacturer"> & {
  manufacturer?: Reference & {
    name?: string;
  };
};

/**
 * Generates a formatted table representing the list of immunizations based on the provided array of immunizations and mappings.
 * @param fhirBundle - The FHIR bundle containing patient and immunizations information.
 * @param immunizationsArray - An array containing the list of immunizations.
 * @param caption - The string to display above the table
 * @param className - Optional. The css class to be added to the table.
 * @returns - A formatted table React element representing the list of immunizations, or undefined if the immunizations array is empty.
 */
export const returnImmunizations = (
  fhirBundle: Bundle,
  immunizationsArray: Immunization[],
  caption: string,
  className?: string,
): React.JSX.Element | undefined => {
  if (immunizationsArray.length === 0) {
    return undefined;
  }

  const columnInfo: ColumnInfoInput[] = [
    { columnName: "Name", infoPath: "immunizationsName" },
    { columnName: "Administration Dates", infoPath: "immunizationsAdminDate" },
    { columnName: "Dose Number", infoPath: "immunizationsDoseNumber" },
    {
      columnName: "Manufacturer",
      infoPath: "immunizationsManufacturerName",
    },
    { columnName: "Lot Number", infoPath: "immunizationsLotNumber" },
  ];

  const modifiedImmunizations: ModifiedImmunization[] = immunizationsArray.map(
    (initialImmunization) => {
      const newImmunization: ModifiedImmunization = {
        ...initialImmunization,
      };

      newImmunization.occurrenceDateTime = formatDateTime(
        initialImmunization.occurrenceDateTime,
      );

      const manufacturer = evaluateReference<Organization>(
        fhirBundle,
        initialImmunization.manufacturer?.reference,
      );

      if (manufacturer) {
        newImmunization.manufacturer = {
          ...initialImmunization.manufacturer,
          name: manufacturer.name || "",
        };
      }

      return newImmunization;
    },
  );

  modifiedImmunizations.sort(
    (a, b) =>
      new Date(b.occurrenceDateTime ?? "").getTime() -
      new Date(a.occurrenceDateTime ?? "").getTime(),
  );

  return (
    <EvaluateTable
      resources={modifiedImmunizations}
      columns={columnInfo}
      caption={caption}
      className={classNames("margin-y-0", className)}
    />
  );
};

/**
 * Generates a formatted table representing the list of problems based on the provided array of problems and mappings.
 * @param fhirBundle - The FHIR bundle containing patient information.
 * @param problemsArray - An array containing the list of Conditions.
 * @returns - A formatted table React element representing the list of problems, or undefined if the problems array is empty.
 */
export const returnProblemsTable = (
  fhirBundle: Bundle,
  problemsArray: Condition[],
): React.JSX.Element | undefined => {
  problemsArray = problemsArray.filter(
    (entry) => entry.code?.coding?.some((c: Coding) => c?.display),
  );

  if (problemsArray.length === 0) {
    return undefined;
  }

  const columnInfo: ColumnInfoInput[] = [
    {
      columnName: "Active Problem",
      infoPath: "activeProblemsDisplay",
    },
    { columnName: "Onset Date/Time", infoPath: "activeProblemsOnsetDate" },
    { columnName: "Onset Age", infoPath: "activeProblemsOnsetAge" },
    {
      columnName: "Comments",
      infoPath: "activeProblemsComments",
      applyToValue: (v) => safeParse(v),
      hiddenBaseText: "comment",
    },
  ];

  problemsArray.forEach((entry) => {
    entry.onsetDateTime = formatDateTime(entry.onsetDateTime);
    entry.onsetAge ||= entry.onsetDateTime
      ? {
          value: calculatePatientAge(fhirBundle, entry.onsetDateTime),
        }
      : undefined;
  });

  if (problemsArray.length === 0) {
    return undefined;
  }

  problemsArray.sort(
    (a, b) =>
      new Date(b.onsetDateTime ?? "").getTime() -
      new Date(a.onsetDateTime ?? "").getTime(),
  );

  return (
    <EvaluateTable
      resources={problemsArray}
      columns={columnInfo}
      caption="Problems List"
      className="margin-y-0"
      fixed={false}
    />
  );
};
