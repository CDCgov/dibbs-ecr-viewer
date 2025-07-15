import {
  Bundle,
  CareTeamParticipant,
  Device,
  Element,
  Location,
  Medication,
  MedicationAdministration,
  MedicationRequest,
  Observation,
  Organization,
  Period,
  Practitioner,
  Reference,
  ServiceRequest,
} from "fhir/r4";

import {
  formatDateTime,
  formatStartEndDate,
} from "@/app/services/formatDateService";
import {
  formatAddress,
  formatAddressList,
  formatCodeableConcept,
  formatContactPoint,
  formatName,
} from "@/app/services/formatService";
import { formatTablesToJSON } from "@/app/services/htmlTableService";
import { evaluateData, notEmpty, safeParse } from "@/app/utils/data-utils";
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
import {
  DataDisplay,
  DisplayDataProps,
} from "@/app/view-data/components/DataDisplay";
import EvaluateTable, {
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

  const emergencyOutbreakInfo: DisplayDataProps[] = [
    {
      title: "Emergency Outbreak Info",
      value: evaluateOutbreakInfo(fhirBundle),
    },
  ];

  const administeredMedication = evaluateAdministeredMedication(fhirBundle);

  const treatmentData: DisplayDataProps[] = [
    {
      title: "Procedures",
      fullWidthContent: true,
      value: returnProceduresTable(fhirBundle),
    },
    {
      title: "Plan of Treatment",
      fullWidthContent: true,
      value: evaluatePlanOfTreatment(fhirBundle),
    },
    {
      title: "Administered Medications",
      fullWidthContent: true,
      value: administeredMedication?.length && (
        <AdministeredMedication medicationData={administeredMedication} />
      ),
    },
    {
      title: "Care Team",
      fullWidthContent: true,
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
    emergencyOutbreakInfo: evaluateData(emergencyOutbreakInfo),
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

  return administeredMedications
    .filter(notEmpty)
    .map((medicationAdministration) => {
      let medication: Medication | undefined;
      if (medicationAdministration?.medicationReference?.reference) {
        medication = evaluateReference(
          fhirBundle,
          medicationAdministration.medicationReference.reference,
        );
      }

      return {
        date:
          medicationAdministration?.effectiveDateTime ??
          medicationAdministration?.effectivePeriod?.start,
        name: formatCodeableConcept(medication?.code),
      };
    });
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
        mctp.period = {
          ...initialParticipant.period,
          text: formatStartEndDate(initialParticipant.period),
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
    fullWidthContent: true,
  };
};

const evaluatePlanOfTreatment = (
  fhirBundle: Bundle,
): React.ReactNode | undefined => {
  const plans = evaluateAll(fhirBundle, fhirPathMappings.planOfTreatment);
  console.log(plans);
  const activities = [];
  const procs = [];
  const meds = [];

  for (const plan of plans) {
    if (plan.detail) {
      activities.push(plan);
    } else if (plan.reference?.reference?.startsWith("ServiceRequest/")) {
      const req = evaluateReference<ServiceRequest>(
        fhirBundle,
        plan.reference.reference,
      );
      console.log({ req });
      if (req) {
        procs.push(req);
      }
    } else if (plan.reference?.reference?.startsWith("MedicationRequest/")) {
      const req = evaluateReference<MedicationRequest>(
        fhirBundle,
        plan.reference.reference,
      );
      if (req) {
        meds.push(req);
      }
    }
  }

  if (activities.length === 0 && procs.length === 0 && meds.length === 0) {
    return undefined;
  }

  return (
    <>
      {activities.length > 0 && (
        <EvaluateTable
          resources={activities}
          caption="Planned Activities & Appointments"
          columns={[
            { columnName: "Name", infoPath: "plannedActivityName" },
            { columnName: "Scheduled Time", infoPath: "plannedActivityTime" },
            { columnName: "Type", infoPath: "plannedActivityType" },
          ]}
        />
      )}
      {procs.length > 0 && (
        <EvaluateTable
          resources={procs}
          caption="Planned Procedures & Orders"
          columns={[
            { columnName: "Name", infoPath: "plannedServiceRequestName" },
            {
              columnName: "Scheduled Time",
              infoPath: "plannedServiceRequestTime",
            },
            { columnName: "Ordered On", infoPath: "authoredOn" },
          ]}
        />
      )}
      {meds.length > 0 && (
        <EvaluateTable
          resources={meds}
          caption="Planned Medications & Immunizations"
          columns={[
            { columnName: "Name", infoPath: "plannedMedicationName" },
            { columnName: "Ordered On", infoPath: "authoredOn" },
            // Add dosage info
          ]}
        />
      )}
    </>
  );
};

/**
 * Generates a formatted table representing the list of procedures based on the provided array of procedures and mappings.
 * @param fhirBundle - The fhir bundle
 * @returns - A formatted table React element representing the list of procedures, or undefined if the procedures array is empty.
 */
export const returnProceduresTable = (
  fhirBundle: Bundle,
): React.JSX.Element | undefined => {
  // Literal Procedure resources
  const procedures = evaluateAll(fhirBundle, fhirPathMappings.procedures);

  // References to Observations in the procedure history section
  const obsRefs = evaluateAll(
    fhirBundle,
    fhirPathMappings.procedureHistoryRefs,
  );
  const obs = obsRefs
    .map((r) => evaluateReference<Observation>(fhirBundle, r.reference))
    .filter(notEmpty);

  if (procedures.length === 0 && obs.length === 0) {
    return undefined;
  }

  const columnInfo: ColumnInfoInput[] = [
    { columnName: "Name", infoPath: "procedureName" },
    {
      columnName: "Date/Time Performed",
      infoPath: "procedureDate",
      sortFn: (a: string, b: string) => {
        const aDate = new Date(
          a.replace("Start: ", "").replace("End: ", "").split("\n")[0],
        );
        const bDate = new Date(
          b.replace("Start: ", "").replace("End: ", "").split("\n")[0],
        );
        return bDate.valueOf() - aDate.valueOf();
      },
    },
    { columnName: "Status", infoPath: "procedureStatus" },
    {
      columnName: "Details",
      hiddenBaseText: "details",
      evaluateEntry: (el) => evaluateProcedureDetails(fhirBundle, el),
    },
  ];

  const procBundle = [...procedures, ...obs];

  return (
    <EvaluateTable
      resources={procBundle}
      columns={columnInfo}
      className="margin-y-0"
    />
  );
};

const evaluateProcedureDetails = (fhirBundle: Bundle, procedure: Element) => {
  const content = [
    {
      title: "Reason",
      value: evaluateAll(procedure, fhirPathMappings.procedureReason)
        .map((v) => formatCodeableConcept(v))
        .join("\n"),
    },
    {
      title: "Body Site",
      value: evaluateAll(procedure, fhirPathMappings.procedureBodySite)
        .map((v) => formatCodeableConcept(v))
        .join("\n"),
    },
    {
      title: "Method",
      value: evaluateAll(procedure, fhirPathMappings.procedureMethod)
        .map((v) => formatCodeableConcept(v))
        .join("\n"),
    },
    {
      title: "Outcome",
      value: evaluateValue(procedure, fhirPathMappings.procedureOutcome),
    },
    {
      title: "Complication",
      value: evaluateAll(procedure, fhirPathMappings.procedureComplication)
        .map((v) => formatCodeableConcept(v))
        .join("\n"),
    },
    {
      title: "Priority",
      value: evaluateValue(procedure, fhirPathMappings.procedurePriority),
    },
    {
      title: "Specimen",
      value: evaluateAll(procedure, fhirPathMappings.procedureSpecimen)
        .map((v) => formatCodeableConcept(v))
        .join("\n"),
    },
    {
      title: "Product",
      value: evaluateAll(procedure, fhirPathMappings.procedureProductRef)
        .map((r) => evaluateReference<Device>(fhirBundle, r.reference))
        .filter(notEmpty)
        .map((d) =>
          [
            formatCodeableConcept(d.type),
            d.identifier &&
              `ID: ${d.identifier?.map(({ value }) => value).join(", ")}`,
          ]
            .filter(Boolean)
            .join("\n"),
        )
        .join("\n\n"),
    },
    {
      title: "Medication",
      value: evaluateAll(procedure, fhirPathMappings.procedureMedRef)
        .map((r) =>
          evaluateReference<MedicationAdministration>(fhirBundle, r.reference),
        )
        .filter(notEmpty)
        .map((ma) => {
          const med = evaluateReference<Medication>(
            fhirBundle,
            ma.medicationReference?.reference,
          );
          return formatCodeableConcept(med?.code);
        })
        .filter(Boolean)
        .join("\n"),
    },
    {
      title: "Service Location",
      value: formatAddress(
        evaluateReference<Location>(
          fhirBundle,
          evaluateOne(procedure, fhirPathMappings.procedureLocationRef)
            ?.reference,
        )?.address,
      ),
    },
    {
      title: "Organization",
      value: evaluateAll(procedure, fhirPathMappings.procedureOrgRef)
        .map((r) => evaluateReference<Organization>(fhirBundle, r.reference))
        .filter(notEmpty)
        .map((o) =>
          [o.name, formatAddressList(o.address), formatContactPoint(o.telecom)]
            .filter(Boolean)
            .join("\n"),
        )
        .join("\n\n"),
    },
  ].filter(({ value }) => !!value);

  if (content.length === 0) return;

  return content.map(({ title, value }, i) => (
    <DataDisplay
      key={title}
      item={{ title, value, dividerLine: i < content.length - 1 }}
    />
  ));
};

/**
 * Returns a formatted table displaying vital signs information.
 * @param fhirBundle - The FHIR bundle containing vital signs information.
 * @returns The JSX element representing the table, or undefined if no vital signs are found.
 */
export const returnVitalsTable = (fhirBundle: Bundle) => {
  const vitals = evaluateAll(fhirBundle, fhirPathMappings.patientVitalSigns);

  if (vitals.length === 0) return;

  // Sort by code to get consistent and reasonable order (e.g. blood pressures near each other)
  vitals.sort((a, b) =>
    (a?.code?.coding?.[0]?.code ?? 0) < (b?.code?.coding?.[0]?.code ?? 0)
      ? -1
      : 1,
  );

  const columns = [
    {
      columnName: "Vital Reading",
      infoPath: "vitalSignType",
      applyToValue: toSentenceCase,
    },
    { columnName: "Result", infoPath: "value" },
    {
      columnName: "Date/Time",
      infoPath: "vitalSignDateTime",
      applyToValue: formatDateTime,
    },
  ];

  return (
    <EvaluateTable
      resources={vitals}
      columns={columns}
      caption="Vital Signs"
      className="margin-y-0"
      fixed={false}
    />
  );
};

const evaluateOutbreakInfo = (fhirBundle: Bundle): string => {
  const outbreakInfos = evaluateAll(
    fhirBundle,
    fhirPathMappings.emergencyOutbreakInfo,
  );

  return outbreakInfos
    .map((outbreakInfo) => {
      const lines = [];

      if (outbreakInfo.effectiveDateTime) {
        lines.push(
          "Date/Time: " + formatDateTime(outbreakInfo.effectiveDateTime),
        );
      } else if (outbreakInfo.effectivePeriod) {
        lines.push(formatStartEndDate(outbreakInfo.effectivePeriod));
      }

      // Get the first display value from the coding array
      const coding = outbreakInfo.code?.coding?.find((c) => c.display);
      if (coding?.display) {
        lines.push("Type: " + coding.display);
      }

      const value = evaluateValue(outbreakInfo, fhirPathMappings.value);
      if (value) {
        lines.push("Result: " + value);
      }

      return lines.join("\n");
    })
    .join("\n\n");
};
