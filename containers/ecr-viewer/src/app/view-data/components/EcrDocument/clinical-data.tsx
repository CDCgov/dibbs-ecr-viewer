import {
  PathMappings,
  evaluateData,
  noData,
  safeParse,
} from "@/app/utils/data-utils";
import { evaluate } from "@/app/utils/evaluate";
import {
  Bundle,
  CarePlanActivity,
  CareTeamParticipant,
  CodeableConcept,
  FhirResource,
  Medication,
  MedicationAdministration,
  Practitioner,
  Procedure,
} from "fhir/r4";
import { DisplayDataProps } from "../DataDisplay";
import { returnImmunizations, returnProblemsTable } from "../common";
import {
  AdministeredMedication,
  AdministeredMedicationTableData,
} from "../AdministeredMedication";
import {
  evaluateReference,
  evaluateValue,
} from "@/app/services/evaluateFhirDataService";
import { formatTablesToJSON } from "@/app/services/htmlTableService";
import { JsonTable } from "../JsonTable";
import EvaluateTable, { BaseTable, ColumnInfoInput } from "../EvaluateTable";
import {
  formatDate,
  formatDateTime,
  formatStartEndDate,
} from "@/app/services/formatDateService";
import { toSentenceCase } from "@/app/utils/format-utils";
import { formatName, formatVitals } from "@/app/services/formatService";

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
    evaluateMiscNotes(fhirBundle, mappings),
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
    evaluatePlanOfTreatment(fhirBundle, mappings, "Plan of Treatment"),
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
      caption="Care Team"
      className="margin-y-0"
      fixed={false}
    />
  );
};

/**
 * Helper to evaluate the misc notes which can be either a string or a table.
 * @param fhirBundle - The FHIR bundle containing clinical data.
 * @param mappings - The object containing the fhir paths.
 * @returns data display props with the appropriate values
 */
export const evaluateMiscNotes = (
  fhirBundle: Bundle,
  mappings: PathMappings,
): DisplayDataProps => {
  const title = "Miscellaneous Notes";
  const toolTip =
    "Clinical notes from various parts of a medical record. Type of note found here depends on how the provider's EHR system onboarded to send eCR.";

  const content =
    evaluateValue(fhirBundle, mappings["historyOfPresentIllness"]) ?? "";

  const tables = formatTablesToJSON(content);

  // Not a table, safe parse the string content
  if (tables.length === 0) {
    return {
      title,
      value: safeParse(content),
      toolTip,
    };
  }

  return {
    title,
    value: (
      <JsonTable
        jsonTableData={{
          resultName: title,
          tables: tables[0].tables,
        }}
        captionToolTip={toolTip}
        captionIsTitle={true}
      />
    ),
    table: true,
  };
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
      caption="Planned Procedures"
      className="margin-y-0"
    />
  );
};

const evaluatePlanOfTreatment = (
  fhirBundle: Bundle,
  mappings: PathMappings,
  title: string,
): DisplayDataProps => {
  const content = evaluateValue(fhirBundle, mappings["planOfTreatment"]);
  const tables = formatTablesToJSON(content);

  if (tables.length === 0)
    return {
      title,
      value: undefined,
    };

  return {
    title,
    value: (
      <>
        <div className="data-title margin-bottom-1">{title}</div>
        {tables.map((table, index) => (
          <JsonTable
            key={`plan-of-treatment-table_${index}`}
            jsonTableData={table}
          />
        ))}
      </>
    ),
  };
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
      caption="Procedures"
      className="margin-y-0"
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
      className="margin-y-0"
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
