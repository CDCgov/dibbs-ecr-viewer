import "server-only"; // FHIR evaluation should be done server side

import {
  AdverseEvent,
  Bundle,
  Condition,
  Element,
  Encounter,
  Location,
  Organization,
  Practitioner,
  PractitionerRole,
} from "fhir/r4";

import {
  formatDateTime,
  formatStartEndDate,
  formatStartEndDateTime,
} from "@/app/services/formatDateService";
import {
  formatAddress,
  formatAddressList,
  formatCodeableConcept,
  formatContactPoint,
  formatName,
  formatCoding,
} from "@/app/services/formatService";
import { HtmlTableJsonRow } from "@/app/services/htmlTableService";
import { evaluateData, noData, notEmpty } from "@/app/utils/data-utils";
import {
  evaluateAll,
  evaluateAllReferences,
  evaluateOne,
  evaluateOneReference,
  evaluateReference,
  evaluateValue,
} from "@/app/utils/evaluate";
import fhirPathMappings from "@/app/utils/evaluate/fhir-paths";
import {
  DataDisplay,
  DataDisplayList,
  DisplayDataProps,
} from "@/app/view-data/components/DataDisplay";
import EvaluateTable, {
  ColumnInfoInput,
} from "@/app/view-data/components/EvaluateTable";
import { JsonTable } from "@/app/view-data/components/JsonTable";
import { UnstyledDividedList } from "@/app/view-data/components/UnstyledDividedList";

// =============================================================================
// Encounter Info: Encounter Details
// =============================================================================

/**
 * Evaluate an encounters diagnosis by returning a comma delimited list of formatted codeable concepts from each condition
 * @param fhirBundle FHIR bundle
 * @param encounter Encounter
 * @returns delimited list of formatted codeable concepts from each condition in the encounters diagnosis
 */
export const evaluateEncounterDiagnosis = (
  fhirBundle: Bundle,
  encounter: Encounter | undefined,
) => {
  return evaluateAllReferences<Condition>(
    fhirBundle,
    fhirPathMappings.encounterDiagnosisRef,
    { id: encounter?.id },
  )
    .map((condition) => formatCodeableConcept(condition?.code))
    .filter(Boolean)
    .join(", ");
};

/**
 * Evaluates provider data from the FHIR bundle and formats it into structured data for display.
 * @param fhirBundle - The FHIR bundle containing provider data.
 * @returns An array of evaluated and formatted provider data.
 */
export const evaluateEncounterCareTeamTable = (fhirBundle: Bundle) => {
  const encounterRef = evaluateOne(
    fhirBundle,
    fhirPathMappings.compositionEncounterRef,
  );
  const encounter = evaluateReference<Encounter>(fhirBundle, encounterRef);
  const participants = evaluateAll(
    encounter,
    fhirPathMappings.encounterParticipants,
  );

  const tables = participants.map((participant) => {
    const role = evaluateValue(participant, "type");
    const participantRef = participant.individual?.reference;

    const { practitioner } = evaluatePractitionerRoleReference(
      fhirBundle,
      participantRef,
    );

    return {
      Name: {
        value: formatName(practitioner?.name?.[0]) || noData,
      },
      Role: {
        value: role || noData,
      },
      Dates: {
        value: formatStartEndDate(participant.period) || noData,
      },
    } as HtmlTableJsonRow;
  });

  if (!tables.length) return undefined;

  return (
    <JsonTable
      jsonTableData={{ resultName: "Encounter Care Team", tables: [tables] }}
      className="caption-data-title margin-y-0"
    />
  );
};

/**
 * Evaluates encounter data from the FHIR bundle and formats it into structured data for display.
 * @param fhirBundle - The FHIR bundle containing encounter data.
 * @returns An array of evaluated and formatted encounter data.
 */
export const evaluateEncounterData = (fhirBundle: Bundle) => {
  const encounter = evaluateOneReference<Encounter>(
    fhirBundle,
    fhirPathMappings.compositionEncounterRef,
  );
  const encounterData = [
    {
      title: "Encounter Date/Time",
      value: formatStartEndDateTime(encounter?.period),
    },
    {
      title: "Encounter Type",
      value: formatCoding(encounter?.class),
    },
    {
      title: "Encounter ID",
      value: encounter?.identifier?.filter((id) => id.value)[0]?.value,
    },
    {
      title: "Encounter Diagnosis",
      value: evaluateEncounterDiagnosis(fhirBundle, encounter),
    },
    {
      title: "Encounter Care Team",
      value: evaluateEncounterCareTeamTable(fhirBundle),
      table: true,
    },
  ];
  return evaluateData(encounterData);
};

// =============================================================================
// Encounter Info: Hospital Encounter Details
// =============================================================================

/**
 * Evaluates either Hospital Admission Diagnosis or Discharge diagnosis data from the FHIR bundle and formats it into structured data for display.
 * @param fhirBundle - The FHIR bundle containing hospital encounter data.
 * @param code - the associated code for the section to be evaluated. e.g. 46241-6 for Admission Dx or 11535-2 for Discharge Dx
 * @param caption - A string to set the caption for the UI element
 * @returns An array of evaluated and formatted hospital encounter data.
 */
const evaluateEncounterDiagnosisData = (
  fhirBundle: Bundle,
  code: string,
  caption: string,
) => {
  const dx = evaluateAllReferences<Condition>(
    fhirBundle,
    fhirPathMappings.hospitalEncounterDiagnosisRef,
    { code },
  );

  if (dx.length === 0) return;

  const dxColumns = [
    {
      columnName: "Problem",
      infoPath: "code",
    },
    {
      columnName: "Date/Time",
      infoPath: "conditionOnsetDate",
      applyToValue: formatDateTime,
    },
  ];

  return <EvaluateTable resources={dx} columns={dxColumns} caption={caption} />;
};

/**
 * Generates a formatted table representing the list of Admission Medications based on the provided array of Admission Medications and mappings.
 * @param fhirBundle - The fhir bundle
 * @returns - A formatted table React element representing the list of Admission Medications, or undefined if the array is empty.
 */
export const returnAdmissionMedicationsTable = (
  fhirBundle: Bundle,
): React.JSX.Element | undefined => {
  const admissionMedications = evaluateAllReferences(
    fhirBundle,
    fhirPathMappings.admissionMedicationRefs,
  );

  if (admissionMedications.length === 0) {
    return undefined;
  }

  const columnInfo: ColumnInfoInput[] = [
    {
      columnName: "Medication Name",
      evaluateEntry: (el) => {
        const medRef = evaluateOne(
          el,
          fhirPathMappings.medicationAdministrationMedicationRef,
        );
        const medication = evaluateReference(fhirBundle, medRef);
        return evaluateValue(medication, fhirPathMappings.code);
      },
    },
    { columnName: "Dose Quantity", infoPath: "medicationDose" },
    {
      columnName: "Start Date",
      evaluateEntry: (el) => {
        return evaluateValue(el, fhirPathMappings.effectiveX).replace(
          "Start: ",
          "",
        );
      },
    },
    { columnName: "Status", infoPath: "status" },
    {
      columnName: "Details",
      hiddenBaseText: "details",
      evaluateEntry: (el) => evaluateAdmissionMedicationDetails(fhirBundle, el),
    },
  ];

  return (
    <EvaluateTable
      resources={admissionMedications}
      columns={columnInfo}
      caption="Admission Medications"
      className="margin-y-0"
    />
  );
};

/**
 * Generates details sections for the Admission Medications table rows.
 * @param fhirBundle - The fhir bundle
 * @param element - The current row being processed
 * @returns - A details element for the current row of the Admission Medications table, or undefined if there's no data
 */
const evaluateAdmissionMedicationDetails = (
  fhirBundle: Bundle,
  element: Element,
) => {
  const performerRefs = evaluateAll(
    element,
    fhirPathMappings.medicationAdministrationPerformerRef,
  );
  const authors = performerRefs
    .map((r) => evaluateReference<Practitioner>(fhirBundle, r.reference))
    .filter(notEmpty);

  const reactionRefs = evaluateAll(
    element,
    fhirPathMappings.medicationAdministrationReactionRef,
  );

  const adverseEvents = reactionRefs
    .map((r) => evaluateReference<AdverseEvent>(fhirBundle, r.reference))
    .filter(notEmpty);

  if (authors.length === 0 && adverseEvents.length === 0) {
    return;
  }

  const content = [
    {
      title: "Medication Details",
      value: (
        <UnstyledDividedList
          items={[
            <MedicationDetails
              practitioners={authors}
              reactions={adverseEvents}
            />,
          ]}
        />
      ),
      fullWidthContent: true,
    },
  ];

  if (content.length === 0) return;

  return <DataDisplayList items={content} />;
};

type MedicationDetailsProps = {
  practitioners: Practitioner[];
  reactions: AdverseEvent[];
};

const MedicationDetails: React.FC<MedicationDetailsProps> = ({
  practitioners,
  reactions,
}) => {
  const authorsStr = practitioners
    .map((p: Practitioner) => formatName(p.name?.[0]))
    .filter(Boolean)
    .join("\n");

  const reactionsStr = Array.from(
    new Set(
      reactions.flatMap(
        (r: AdverseEvent) =>
          r.event?.coding?.map((c) => c.display || c.code || "") ?? [],
      ),
    ),
  )
    .filter(Boolean)
    .join("\n");

  const baseInfo = [
    authorsStr && { title: "Author", value: authorsStr },
    reactionsStr && { title: "Reaction", value: reactionsStr },
  ].filter(Boolean) as { title: string; value: string }[];

  return baseInfo.map(({ title, value }, i) => (
    <DataDisplay
      key={`wi-${i}`}
      item={{
        title,
        value,
        dividerLine: false,
        titleNormal: true,
      }}
    />
  ));
};

/**
 * Evaluates Hospital Encounter Admission Diagnosis, Admission Medications, and Discharge diagnosis data from the FHIR bundle and formats it into structured data for display.
 * @param fhirBundle - The FHIR bundle containing hospital encounter data.
 * @returns An array of evaluated and formatted hospital encounter data.
 */
export const evaluateHospitalEncounterData = (fhirBundle: Bundle) => {
  const hospitalEncounterData = [
    {
      title: "Hospital Admission Diagnosis",
      value: evaluateEncounterDiagnosisData(
        fhirBundle,
        "46241-6",
        "Hospital Admission Diagnosis",
      ),
      table: true,
    },
    {
      title: "Admission Medications",
      value: returnAdmissionMedicationsTable(fhirBundle),
      table: true,
    },
    {
      title: "Hospital Discharge Diagnosis",
      value: evaluateEncounterDiagnosisData(
        fhirBundle,
        "11535-2",
        "Hospital Discharge Diagnosis",
      ),
      table: true,
    },
  ];
  return evaluateData(hospitalEncounterData);
};

// =============================================================================
// Encounter Info: Facility Details
// =============================================================================

/**
 * Get an encounter's location name by first looking for the `display` of the `location.location`. If that does not exist, then evaluate each location reference and return the `name` of the first location with a `name`.
 * @param bundle - The FHIR Bundle.
 * @param encounter The relevant Encounter.
 * @returns string or undefined
 */
export const getLocationName = (
  bundle: Bundle,
  encounter: Encounter | undefined,
) => {
  const encounterLocationDisplay = encounter?.location?.filter(
    (location) => location.location.display,
  )[0]?.location.display;

  if (encounterLocationDisplay) {
    return encounterLocationDisplay;
  }

  const references = encounter?.location
    ?.filter((location) => location.location.reference)
    .map((location) => location.location.reference);
  const locations = references
    ?.map((reference) => evaluateReference<Location>(bundle, reference))
    ?.filter((location) => location?.name);
  const locationName = locations?.at(0)?.name;

  return locationName;
};

/**
 * Evaluates facility data from the FHIR bundle and formats it into structured data for display.
 * @param fhirBundle - The FHIR bundle containing facility data.
 * @returns An array of evaluated and formatted facility data.
 */
export const evaluateFacilityData = (fhirBundle: Bundle) => {
  const encounter = evaluateOneReference<Encounter>(
    fhirBundle,
    fhirPathMappings.compositionEncounterRef,
  );

  const locationRef = evaluateOne(
    encounter,
    fhirPathMappings.facilityLocationRef,
  );
  const location = evaluateReference<Location>(fhirBundle, locationRef);

  const orgRef = evaluateOne(encounter, fhirPathMappings.facilityOrgRef);
  const org = evaluateReference<Organization>(fhirBundle, orgRef);

  const facilityData = [
    {
      title: "Facility Name",
      value: getLocationName(fhirBundle, encounter),
    },
    {
      title: "Facility Address",
      value: formatAddress(location?.address),
    },
    {
      title: "Facility Contact Address",
      value: formatAddressList(org?.address),
    },
    {
      title: "Facility Contact",
      value: formatContactPoint(org?.telecom),
    },
    {
      title: "Facility Type",
      value: location?.type && formatCodeableConcept(location?.type[0]),
    },
    {
      title: "Facility ID",
      value: location?.identifier?.filter((id) => id.value)[0]?.value,
    },
  ];
  return evaluateData(facilityData);
};

// =============================================================================
// Encounter Info: Provider Details
// =============================================================================

/**
 * Evaluate practitioner role reference
 * @param fhirBundle - The FHIR bundle containing resources.
 * @param practitionerRoleRef - practitioner role reference to be searched.
 * @returns practitioner and organization
 */
export const evaluatePractitionerRoleReference = (
  fhirBundle: Bundle,
  practitionerRoleRef?: string,
): { practitioner?: Practitioner; organization?: Organization } => {
  if (!practitionerRoleRef) return {};

  const practitionerRole = evaluateReference<PractitionerRole>(
    fhirBundle,
    practitionerRoleRef,
  );
  const practitioner = evaluateReference<Practitioner>(
    fhirBundle,
    practitionerRole?.practitioner?.reference,
  );
  const organization = evaluateReference<Organization>(
    fhirBundle,
    practitionerRole?.organization?.reference,
  );

  return { practitioner, organization };
};

/**
 * Evaluates provider data from the FHIR bundle and formats it into structured data for display.
 * @param fhirBundle - The FHIR bundle containing provider data.
 * @returns An array of evaluated and formatted provider data.
 */
export const evaluateProviderData = (fhirBundle: Bundle) => {
  const encounter = evaluateOneReference<Encounter>(
    fhirBundle,
    fhirPathMappings.compositionEncounterRef,
  );

  const encounterAttendingRefs = evaluateAll(
    encounter,
    fhirPathMappings.encounterAttendingRefs,
  );

  // CDA has there being only one responsible party per eCR - find them
  const { practitioner, organization } =
    encounterAttendingRefs
      .map((encounterAttendingRef) =>
        evaluatePractitionerRoleReference(
          fhirBundle,
          encounterAttendingRef.individual?.reference,
        ),
      )
      .find(
        ({ practitioner }) =>
          practitioner?.extension?.find(
            ({ url }) =>
              url === "http://hl7.org/fhir/StructureDefinition/_datatype",
          )?.valueString === "Responsible Party",
      ) || {};

  const providerData: DisplayDataProps[] = [
    {
      title: "Provider Name",
      value: formatName(practitioner?.name?.[0]),
    },
    {
      title: "Provider Address",
      value: formatAddressList(practitioner?.address),
    },
    {
      title: "Provider Contact",
      value: formatContactPoint(practitioner?.telecom),
    },
    {
      title: "Provider Facility Name",
      value: organization?.name,
    },
    {
      title: "Provider Facility Address",
      value: formatAddressList(organization?.address),
    },
    {
      title: "Provider ID",
      value: practitioner?.identifier?.map((id) => id.value).join("\n"),
    },
  ];

  return evaluateData(providerData);
};
