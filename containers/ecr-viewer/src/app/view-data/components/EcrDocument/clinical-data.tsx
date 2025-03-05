import {
  Bundle,
  CarePlanActivity,
  CareTeamParticipant,
  Medication,
  MedicationAdministration,
  Period,
  Practitioner,
  Procedure,
  Reference,
} from "fhir/r4";

import { getHumanReadableCodeableConcept } from "@/app/services/evaluateFhirDataService";
import {
  formatDate,
  formatDateTime,
  formatStartEndDate,
} from "@/app/services/formatDateService";
import { formatName } from "@/app/services/formatService";
import { formatTablesToJSON } from "@/app/services/htmlTableService";
import { evaluateData, noData, safeParse } from "@/app/utils/data-utils";
import {
  evaluateAll,
  evaluateOne,
  evaluateReference,
  evaluateValue,
} from "@/app/utils/evaluate";
import fhirPathMappings from "@/app/utils/evaluate/fhir-paths";
import { toSentenceCase } from "@/app/utils/format-utils";
import {
  AdministeredMedication,
  AdministeredMedicationTableData,
} from "@/app/view-data/components/AdministeredMedication";
import { DisplayDataProps } from "@/app/view-data/components/DataDisplay";
import EvaluateTable, {
  BaseTable,
  ColumnInfoInput,
} from "@/app/view-data/components/EvaluateTable";
import { JsonTable } from "@/app/view-data/components/JsonTable";
import {
  returnImmunizations,
  returnProblemsTable,
} from "@/app/view-data/components/common";

/**
 * Evaluates clinical data from the FHIR bundle and formats it into structured data for display.
 * @param fhirBundle - The FHIR bundle containing clinical data.
 * @returns An object containing evaluated and formatted clinical data.
 * @property {DisplayDataProps[]} clinicalNotes - Clinical notes data.
 * @property {DisplayDataProps[]} reasonForVisitDetails - Reason for visit details.
 * @property {DisplayDataProps[]} activeProblemsDetails - Active problems details.
 * @property {DisplayDataProps[]} treatmentData - Treatment-related data.
 * @property {DisplayDataProps[]} vitalData - Vital signs data.
 * @property {DisplayDataProps[]} immunizationsDetails - Immunization details.
 */
export const evaluateClinicalData = (fhirBundle: Bundle) => {
  const clinicalNotes: DisplayDataProps[] = [evaluateMiscNotes(fhirBundle)];

  const reasonForVisitData: DisplayDataProps[] = [
    {
      title: "Reason for Visit",
      value: evaluateValue(fhirBundle, fhirPathMappings.clinicalReasonForVisit),
    },
  ];

  const activeProblemsTableData: DisplayDataProps[] = [
    {
      title: "Problems List",
      value: returnProblemsTable(
        fhirBundle,
        evaluateAll(fhirBundle, fhirPathMappings.activeProblems),
      ),
    },
  ];

  const administeredMedication = evaluateAdministeredMedication(fhirBundle);

  const treatmentData: DisplayDataProps[] = [
    {
      title: "Procedures",
      value: returnProceduresTable(
        evaluateAll(fhirBundle, fhirPathMappings.procedures),
      ),
    },
    {
      title: "Planned Procedures",
      value: returnPlannedProceduresTable(
        evaluateAll(fhirBundle, fhirPathMappings.plannedProcedures),
      ),
    },
    evaluatePlanOfTreatment(fhirBundle, "Plan of Treatment"),
    {
      title: "Administered Medications",
      value: administeredMedication?.length && (
        <AdministeredMedication medicationData={administeredMedication} />
      ),
    },
    {
      title: "Care Team",
      value: returnCareTeamTable(fhirBundle),
    },
  ];

  const vitalData = [
    {
      title: "Vital Signs",
      value: returnVitalsTable(fhirBundle),
    },
  ];

  const immunizationsData: DisplayDataProps[] = [
    {
      title: "Immunization History",
      value: returnImmunizations(
        fhirBundle,
        evaluateAll(fhirBundle, fhirPathMappings.immunizations),
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
 * @returns - Administered data array
 */
const evaluateAdministeredMedication = (
  fhirBundle: Bundle,
): AdministeredMedicationTableData[] => {
  const administeredMedicationReferences = evaluateAll(
    fhirBundle,
    fhirPathMappings.adminMedicationsRefs,
  );
  if (!administeredMedicationReferences?.length) {
    return [];
  }
  const administeredMedications = administeredMedicationReferences.map((ref) =>
    evaluateReference<MedicationAdministration>(fhirBundle, ref),
  );

  return administeredMedications.reduce<AdministeredMedicationTableData[]>(
    (data, medicationAdministration) => {
      let medication: Medication | undefined;
      if (medicationAdministration?.medicationReference?.reference) {
        medication = evaluateReference(
          fhirBundle,
          medicationAdministration.medicationReference.reference,
        );
      }

      data.push({
        date:
          medicationAdministration?.effectiveDateTime ??
          medicationAdministration?.effectivePeriod?.start,
        name: getHumanReadableCodeableConcept(medication?.code),
      });
      return data;
    },
    [],
  );
};

type ModifiedCareTeamParticipant = Omit<
  CareTeamParticipant,
  "period" | "member"
> & {
  period?: Period & { text?: string };
  member?: Reference & { name?: string };
};

/**
 * Returns a table displaying care team information.
 * @param bundle - The FHIR bundle containing care team data.
 * @returns The JSX element representing the care team table, or undefined if no care team participants are found.
 */
export const returnCareTeamTable = (
  bundle: Bundle,
): React.JSX.Element | undefined => {
  const careTeamParticipants = evaluateAll(
    bundle,
    fhirPathMappings.careTeamParticipants,
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

  const modifiedCareTeamParticipants: ModifiedCareTeamParticipant[] =
    careTeamParticipants.map((initialParticipant) => {
      const mctp: ModifiedCareTeamParticipant = {
        ...initialParticipant,
      };

      if (initialParticipant.period) {
        const { start, end } = initialParticipant.period;
        mctp.period = {
          ...initialParticipant.period,
          text: formatStartEndDate(start, end),
        };
      }

      const practitioner = evaluateReference<Practitioner>(
        bundle,
        initialParticipant?.member?.reference,
      );

      const practitionerNameObj = practitioner?.name?.find(
        (nameObject) => nameObject.family,
      );

      if (initialParticipant.member) {
        mctp.member = {
          ...initialParticipant.member,
          name: formatName(practitionerNameObj),
        };
      }

      return mctp;
    });

  return (
    <EvaluateTable
      resources={modifiedCareTeamParticipants}
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
 * @returns data display props with the appropriate values
 */
export const evaluateMiscNotes = (fhirBundle: Bundle): DisplayDataProps => {
  const title = "Miscellaneous Notes";
  const toolTip =
    "Clinical notes from various parts of a medical record. Type of note found here depends on how the provider's EHR system onboarded to send eCR.";

  const content = evaluateValue(
    fhirBundle,
    fhirPathMappings.historyOfPresentIllness,
  );

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
 * @returns - A formatted table React element representing the list of planned procedures, or undefined if the procedures array is empty.
 */
export const returnPlannedProceduresTable = (
  carePlanActivities: CarePlanActivity[],
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
      columns={columnInfo}
      caption="Planned Procedures"
      className="margin-y-0"
    />
  );
};

const evaluatePlanOfTreatment = (
  fhirBundle: Bundle,
  title: string,
): DisplayDataProps => {
  const content = evaluateValue(fhirBundle, fhirPathMappings.planOfTreatment);
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
 * @returns - A formatted table React element representing the list of procedures, or undefined if the procedures array is empty.
 */
export const returnProceduresTable = (
  proceduresArray: Procedure[],
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
      columns={columnInfo}
      caption="Procedures"
      className="margin-y-0"
    />
  );
};

/**
 * Returns a formatted table displaying vital signs information.
 * @param fhirBundle - The FHIR bundle containing vital signs information.
 * @returns The JSX element representing the table, or undefined if no vital signs are found.
 */
export const returnVitalsTable = (fhirBundle: Bundle) => {
  const height = evaluateValue(fhirBundle, fhirPathMappings.patientHeight);
  const heightDate: string | undefined = evaluateOne(
    fhirBundle,
    fhirPathMappings.patientHeightDate,
  );

  const weight = evaluateValue(fhirBundle, fhirPathMappings.patientWeight);
  const weightDate: string | undefined = evaluateOne(
    fhirBundle,
    fhirPathMappings.patientWeightDate,
  );

  const bmi = evaluateValue(fhirBundle, fhirPathMappings.patientBmi);
  const bmiDate: string | undefined = evaluateOne(
    fhirBundle,
    fhirPathMappings.patientBmiDate,
  );

  if (!height && !weight && !bmi) {
    return undefined;
  }

  const vitalsData = [
    {
      vitalReading: "Height",
      result: height || noData,
      date: formatDateTime(heightDate) || noData,
    },
    {
      vitalReading: "Weight",
      result: weight || noData,
      date: formatDateTime(weightDate) || noData,
    },
    {
      vitalReading: "BMI",
      result: bmi || noData,
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
