import {
  calculatePatientAge,
  evaluateReference,
  evaluateValue,
} from "@/app/services/evaluateFhirDataService";
import EvaluateTable, {
  BaseTable,
  ColumnInfoInput,
} from "@/app/view-data/components/EvaluateTable";
import { formatName, formatVitals } from "@/app/services/formatService";
import {
  PathMappings,
  evaluateData,
  noData,
  safeParse,
} from "@/app/utils/data-utils";
import {
  Bundle,
  CarePlanActivity,
  CareTeamParticipant,
  CodeableConcept,
  Coding,
  Condition,
  FhirResource,
  Immunization,
  Medication,
  MedicationAdministration,
  Organization,
  Practitioner,
  Procedure,
} from "fhir/r4";
import { evaluate } from "@/app/utils/evaluate";
import { DisplayDataProps } from "@/app/view-data/components/DataDisplay";
import {
  AdministeredMedication,
  AdministeredMedicationTableData,
} from "@/app/view-data/components/AdministeredMedication";
import { Path } from "fhirpath";
import classNames from "classnames";
import { Fragment } from "react";
import {
  formatTablesToJSON,
  TableJson,
  TableRow,
} from "@/app/services/htmlTableService";
import { toSentenceCase } from "@/app/utils/format-utils";
import {
  formatDate,
  formatDateTime,
  formatStartEndDate,
} from "@/app/services/formatDateService";

/**
 * Returns a table displaying care team information.
 * @param bundle - The FHIR bundle containing care team data.
 * @param mappings - The object containing the fhir paths.
 * @returns The JSX element representing the care team table, or undefined if no care team participants are found.
 */
export const returnCareTeamTable = (
  bundle: Bundle,
  mappings: PathMappings,
): React.JSX.Element | undefined => {
  const careTeamParticipants: CareTeamParticipant[] = evaluate(
    bundle,
    mappings["careTeamParticipants"],
  );
  if (careTeamParticipants.length === 0) {
    return undefined;
  }

  const columnInfo: ColumnInfoInput[] = [
    { columnName: "Member", infoPath: "careTeamParticipantMemberName" },
    { columnName: "Role", infoPath: "careTeamParticipantRole" },
    {
      columnName: "Status",
      infoPath: "careTeamParticipantStatus",
      applyToValue: toSentenceCase,
    },
    { columnName: "Dates", infoPath: "careTeamParticipantPeriod" },
  ];

  careTeamParticipants.forEach((entry) => {
    if (entry?.period) {
      const { start, end } = entry.period;
      (entry.period as any).text = formatStartEndDate(start, end);
    }

    const practitioner: Practitioner = evaluateReference(
      bundle,
      mappings,
      entry?.member?.reference || "",
    );
    const practitionerNameObj = practitioner.name?.find(
      (nameObject) => nameObject.family,
    );
    if (entry.member) {
      (entry.member as any).name = formatName(practitionerNameObj);
    }
  });
  return (
    <EvaluateTable
      resources={careTeamParticipants as FhirResource[]}
      mappings={mappings}
      columns={columnInfo}
      caption={"Care Team"}
      className={"margin-y-0"}
      fixed={false}
    />
  );
};

/**
 * Generates a formatted table representing the list of immunizations based on the provided array of immunizations and mappings.
 * @param fhirBundle - The FHIR bundle containing patient and immunizations information.
 * @param immunizationsArray - An array containing the list of immunizations.
 * @param mappings - An object containing the FHIR path mappings.
 * @param caption - The string to display above the table
 * @param className - Optional. The css class to be added to the table.
 * @returns - A formatted table React element representing the list of immunizations, or undefined if the immunizations array is empty.
 */
export const returnImmunizations = (
  fhirBundle: Bundle,
  immunizationsArray: Immunization[],
  mappings: PathMappings,
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

  immunizationsArray.forEach((entry) => {
    entry.occurrenceDateTime = formatDateTime(entry.occurrenceDateTime ?? "");

    const manufacturer: Organization = evaluateReference(
      fhirBundle,
      mappings,
      entry.manufacturer?.reference || "",
    );
    if (manufacturer) {
      (entry.manufacturer as any).name = manufacturer.name || "";
    }
  });

  immunizationsArray.sort(
    (a, b) =>
      new Date(b.occurrenceDateTime ?? "").getTime() -
      new Date(a.occurrenceDateTime ?? "").getTime(),
  );
  return (
    <EvaluateTable
      resources={immunizationsArray}
      mappings={mappings}
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
 * @param mappings - An object containing the FHIR path mappings.
 * @returns - A formatted table React element representing the list of problems, or undefined if the problems array is empty.
 */
export const returnProblemsTable = (
  fhirBundle: Bundle,
  problemsArray: Condition[],
  mappings: PathMappings,
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
    entry.onsetAge = {
      value: calculatePatientAge(fhirBundle, mappings, entry.onsetDateTime),
    };
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
      mappings={mappings}
      columns={columnInfo}
      caption={"Problems List"}
      className={"margin-y-0"}
      fixed={false}
    />
  );
};

/**
 * Returns a header and tables from XHTML in the FHIR data.
 * @param fhirBundle - The FHIR bundle.
 * @param mapping - The fhir path.
 * @param title - The table header title
 * @param outerBorder - Determines whether to include an outer border for the table. Default is true.
 * @param className - Classnames to be applied to table.
 * @returns The JSX element representing the table, or undefined if no pending results are found.
 */
export const returnHtmlTableContent = (
  fhirBundle: Bundle,
  mapping: string | Path,
  title: string,
  outerBorder = true,
  className = "",
) => {
  const bundle = evaluateValue(fhirBundle, mapping);
  const rawTables = formatTablesToJSON(bundle);
  const tables = rawTables
    .map((rawTable) => returnTableFromJson(rawTable, outerBorder, className))
    .filter((t) => !!t);

  if (tables.length > 0) {
    return (
      <Fragment key={`${Math.random()}`}>
        {!!title && <div className={"data-title margin-bottom-1"}>{title}</div>}
        {tables}
      </Fragment>
    );
  }
};

/**
 * Returns a table built from JSON representation of the XHTML in the FHIR data.
 * @param rawTable - A table found in the fhir data.
 * @param outerBorder - Determines whether to include an outer border for the table. Default is true.
 * @param className - Classnames to be applied to table.
 * @returns The JSX element representing the table, or undefined if no matching results are found.
 */
export const returnTableFromJson = (
  rawTable: TableJson,
  outerBorder = true,
  className = "",
) => {
  const { resultName, tables } = rawTable;
  const flatTables = tables?.flatMap((a) => a) ?? [];
  if (flatTables.length > 0) {
    const columns = Object.keys(flatTables[0]).map((columnName) => {
      return { columnName, className: "bg-gray-5 minw-10" };
    });

    return (
      <BaseTable
        key={resultName || `${Math.random()}`}
        columns={columns}
        caption={resultName}
        className={classNames(
          "caption-normal-weight margin-bottom-2",
          className,
        )}
        fixed={false}
        outerBorder={outerBorder}
      >
        {flatTables.map((entry: TableRow, index: number) => (
          <tr key={`table-row-${index}`}>
            {Object.values(entry).map((v, i) => (
              <td key={`table-col-${i}`}>{v?.value ?? noData}</td>
            ))}
          </tr>
        ))}
      </BaseTable>
    );
  }
};

/**
 * Generates a formatted table representing the list of procedures based on the provided array of procedures and mappings.
 * @param proceduresArray - An array containing the list of procedures.
 * @param mappings - An object containing FHIR path mappings for procedure attributes.
 * @returns - A formatted table React element representing the list of procedures, or undefined if the procedures array is empty.
 */
export const returnProceduresTable = (
  proceduresArray: Procedure[],
  mappings: PathMappings,
): React.JSX.Element | undefined => {
  if (proceduresArray.length === 0) {
    return undefined;
  }

  const columnInfo: ColumnInfoInput[] = [
    { columnName: "Name", infoPath: "procedureName" },
    { columnName: "Date/Time Performed", infoPath: "procedureDate" },
    { columnName: "Reason", infoPath: "procedureReason" },
  ];

  proceduresArray = proceduresArray.map((entry) => {
    // Have date and time be on two different lines
    const dt = formatDateTime(entry.performedDateTime);
    return { ...entry, performedDateTime: dt.replace(" ", "\n") };
  });

  proceduresArray.sort(
    (a, b) =>
      new Date(b.performedDateTime ?? "").getTime() -
      new Date(a.performedDateTime ?? "").getTime(),
  );

  return (
    <EvaluateTable
      resources={proceduresArray}
      mappings={mappings}
      columns={columnInfo}
      caption={"Procedures"}
      className={"margin-y-0"}
    />
  );
};

/**
 * Generates a formatted table representing the list of planned procedures
 * @param carePlanActivities - An array containing the list of procedures.
 * @param mappings - An object containing FHIR path mappings for procedure attributes.
 * @returns - A formatted table React element representing the list of planned procedures, or undefined if the procedures array is empty.
 */
export const returnPlannedProceduresTable = (
  carePlanActivities: CarePlanActivity[],
  mappings: PathMappings,
): React.JSX.Element | undefined => {
  carePlanActivities = carePlanActivities.filter(
    (entry) => entry.detail?.code?.coding?.[0]?.display,
  );

  if (carePlanActivities.length === 0) {
    return undefined;
  }

  const columnInfo: ColumnInfoInput[] = [
    { columnName: "Procedure Name", infoPath: "plannedProcedureName" },
    {
      columnName: "Ordered Date",
      infoPath: "plannedProcedureOrderedDate",
      applyToValue: formatDate,
    },
    {
      columnName: "Scheduled Date",
      infoPath: "plannedProcedureScheduledDate",
      applyToValue: formatDate,
    },
  ];

  return (
    <EvaluateTable
      resources={carePlanActivities}
      mappings={mappings}
      columns={columnInfo}
      caption={"Planned Procedures"}
      className={"margin-y-0"}
    />
  );
};

/**
 * Returns a formatted table displaying vital signs information.
 * @param fhirBundle - The FHIR bundle containing vital signs information.
 * @param mappings - The object containing the FHIR paths.
 * @returns The JSX element representing the table, or undefined if no vital signs are found.
 */
export const returnVitalsTable = (
  fhirBundle: Bundle,
  mappings: PathMappings,
) => {
  const heightAmount = evaluate(fhirBundle, mappings["patientHeight"])[0];
  const heightUnit = evaluate(
    fhirBundle,
    mappings["patientHeightMeasurement"],
  )[0];
  const heightDate = evaluate(fhirBundle, mappings["patientHeightDate"])[0];
  const weightAmount = evaluate(fhirBundle, mappings["patientWeight"])[0];
  const weightUnit = evaluate(
    fhirBundle,
    mappings["patientWeightMeasurement"],
  )[0];
  const weightDate = evaluate(fhirBundle, mappings["patientWeightDate"])[0];
  const bmiAmount = evaluate(fhirBundle, mappings["patientBmi"])[0];
  const bmiUnit = evaluate(fhirBundle, mappings["patientBmiMeasurement"])[0];
  const bmiDate = evaluate(fhirBundle, mappings["patientBmiDate"])[0];

  const formattedVitals = formatVitals(
    heightAmount,
    heightUnit,
    weightAmount,
    weightUnit,
    bmiAmount,
    bmiUnit,
  );

  if (
    !formattedVitals.height &&
    !formattedVitals.weight &&
    !formattedVitals.bmi
  ) {
    return undefined;
  }

  const vitalsData = [
    {
      vitalReading: "Height",
      result: formattedVitals.height || noData,
      date: formatDateTime(heightDate) || noData,
    },
    {
      vitalReading: "Weight",
      result: formattedVitals.weight || noData,
      date: formatDateTime(weightDate) || noData,
    },
    {
      vitalReading: "BMI",
      result: formattedVitals.bmi || noData,
      date: formatDateTime(bmiDate) || noData,
    },
  ];
  const columns = [
    { columnName: "Vital Reading" },
    { columnName: "Result" },
    { columnName: "Date/Time" },
  ];

  return (
    <BaseTable
      columns={columns}
      caption="Vital Signs"
      className={"margin-y-0"}
      fixed={false}
    >
      {vitalsData.map((entry, index: number) => (
        <tr key={`table-row-${index}`}>
          <td>{entry.vitalReading}</td>
          <td>{entry.result}</td>
          <td>{entry.date}</td>
        </tr>
      ))}
    </BaseTable>
  );
};

/**
 * Evaluates clinical data from the FHIR bundle and formats it into structured data for display.
 * @param fhirBundle - The FHIR bundle containing clinical data.
 * @param mappings - The object containing the fhir paths.
 * @returns An object containing evaluated and formatted clinical data.
 * @property {DisplayDataProps[]} clinicalNotes - Clinical notes data.
 * @property {DisplayDataProps[]} reasonForVisitDetails - Reason for visit details.
 * @property {DisplayDataProps[]} activeProblemsDetails - Active problems details.
 * @property {DisplayDataProps[]} treatmentData - Treatment-related data.
 * @property {DisplayDataProps[]} vitalData - Vital signs data.
 * @property {DisplayDataProps[]} immunizationsDetails - Immunization details.
 */
export const evaluateClinicalData = (
  fhirBundle: Bundle,
  mappings: PathMappings,
) => {
  const clinicalNotes: DisplayDataProps[] = [
    {
      title: "Miscellaneous Notes",
      value: safeParse(
        evaluateValue(fhirBundle, mappings["historyOfPresentIllness"]) ?? "",
      ),
      toolTip:
        "Clinical notes from various parts of a medical record. Type of note found here depends on how the provider's EHR system onboarded to send eCR.",
    },
  ];

  const reasonForVisitData: DisplayDataProps[] = [
    {
      title: "Reason for Visit",
      value: evaluate(fhirBundle, mappings["clinicalReasonForVisit"])[0],
    },
  ];

  const activeProblemsTableData: DisplayDataProps[] = [
    {
      title: "Problems List",
      value: returnProblemsTable(
        fhirBundle,
        evaluate(fhirBundle, mappings["activeProblems"]),
        mappings,
      ),
    },
  ];

  const administeredMedication = evaluateAdministeredMedication(
    fhirBundle,
    mappings,
  );

  const treatmentData: DisplayDataProps[] = [
    {
      title: "Procedures",
      value: returnProceduresTable(
        evaluate(fhirBundle, mappings["procedures"]),
        mappings,
      ),
    },
    {
      title: "Planned Procedures",
      value: returnPlannedProceduresTable(
        evaluate(fhirBundle, mappings["plannedProcedures"]),
        mappings,
      ),
    },
    {
      title: "Plan of Treatment",
      value: returnHtmlTableContent(
        fhirBundle,
        mappings["planOfTreatment"],
        "Plan of Treatment",
      ),
    },
    {
      title: "Administered Medications",
      value: administeredMedication?.length && (
        <AdministeredMedication medicationData={administeredMedication} />
      ),
    },
    {
      title: "Care Team",
      value: returnCareTeamTable(fhirBundle, mappings),
    },
  ];

  const vitalData = [
    {
      title: "Vital Signs",
      value: returnVitalsTable(fhirBundle, mappings),
    },
  ];

  const immunizationsData: DisplayDataProps[] = [
    {
      title: "Immunization History",
      value: returnImmunizations(
        fhirBundle,
        evaluate(fhirBundle, mappings["immunizations"]),
        mappings,
        "Immunization History",
      ),
    },
  ];
  return {
    clinicalNotes: evaluateData(clinicalNotes),
    reasonForVisitDetails: evaluateData(reasonForVisitData),
    activeProblemsDetails: evaluateData(activeProblemsTableData),
    treatmentData: evaluateData(treatmentData),
    vitalData: evaluateData(vitalData),
    immunizationsDetails: evaluateData(immunizationsData),
  };
};

/**
 * Evaluate administered medications to create AdministeredMedicationTableData
 * @param fhirBundle - The FHIR bundle containing administered medication.
 * @param mappings - The object containing the fhir paths.
 * @returns - Administered data array
 */
const evaluateAdministeredMedication = (
  fhirBundle: Bundle,
  mappings: PathMappings,
): AdministeredMedicationTableData[] => {
  const administeredMedicationReferences: string[] | undefined = evaluate(
    fhirBundle,
    mappings["adminMedicationsRefs"],
  );
  if (!administeredMedicationReferences?.length) {
    return [];
  }
  const administeredMedications: MedicationAdministration[] =
    administeredMedicationReferences.map((ref) =>
      evaluateReference(fhirBundle, mappings, ref),
    );

  return administeredMedications.reduce<AdministeredMedicationTableData[]>(
    (data, medicationAdministration) => {
      let medication: Medication | undefined;
      if (medicationAdministration?.medicationReference?.reference) {
        medication = evaluateReference(
          fhirBundle,
          mappings,
          medicationAdministration.medicationReference.reference,
        );
      }

      data.push({
        date:
          medicationAdministration.effectiveDateTime ??
          medicationAdministration.effectivePeriod?.start,
        name: getMedicationDisplayName(medication?.code),
      });
      return data;
    },
    [],
  );
};

/**
 * Given a CodeableConcept, find an appropriate display name
 * @param code - The codable concept if available.
 * @returns - String with a name to display (can be "Unknown")
 */
export function getMedicationDisplayName(
  code: CodeableConcept | undefined,
): string | undefined {
  const codings = code?.coding ?? [];
  let name;
  // Pull out the first name we find,
  for (const coding of codings) {
    if (coding.display) {
      name = coding.display;
      break;
    }
  }

  // There is a code, but no names, pull out the first code to give the user
  // something to go off of
  if (name === undefined && codings.length > 0) {
    const { system, code } = codings[0];
    name = `Unknown medication name - ${system} code ${code}`;
  }

  return name;
}
