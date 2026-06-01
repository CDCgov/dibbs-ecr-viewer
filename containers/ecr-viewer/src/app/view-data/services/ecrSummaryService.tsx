import React from "react";

import {
  Bundle,
  Condition,
  DiagnosticReport,
  DomainResource,
  Encounter,
  Immunization,
  Observation,
  Organization,
} from "fhir/r4";

import {
  formatDate,
  formatStartEndDateTime,
} from "@/app/services/formatDateService";
import {
  formatCodeableConcept,
  formatCoding,
  formatContactPoint,
  formatCurrentAddress,
  formatPatientContactList,
} from "@/app/services/formatService";
import { evaluateData } from "@/app/utils/data-utils";
import {
  evaluateAll,
  evaluateOne,
  evaluateOneReference,
  evaluateReference,
} from "@/app/utils/evaluate";
import fhirPathMappings from "@/app/utils/evaluate/fhir-paths";
import { toTitleCase } from "@/app/utils/format-utils";
import { DisplayDataProps } from "@/app/view-data/components/DataDisplay";
import { ConditionSummary } from "@/app/view-data/components/EcrSummary";
import { LabAccordion } from "@/app/view-data/components/LabAccordion";
import {
  returnImmunizations,
  returnProblemsTable,
} from "@/app/view-data/components/common";

import {
  evaluatePatientName,
  evaluatePatientRace,
  evaluatePatientEthnicity,
  censorGender,
  calculatePatientAge,
  evaluateEncounterDiagnosis,
  getLocationName,
  getPatient,
  evaluatePatientDOB,
} from "./evaluateFhirDataService";
import { evaluateLabInfoData } from "./labsService";
import { getReportabilityRulesReasons } from "./reportabilityService";
import { FhirIndex, getResourcesByType } from "./fhirResourcesIndexService";

/**
 * Evaluates and retrieves patient details from the FHIR bundle using the provided path mappings.
 * @param fhirBundle - The FHIR bundle containing patient data.
 * @returns An array of patient details objects containing title and value pairs.
 */
export const evaluateEcrSummaryPatientDetails = (
  fhirBundle: Bundle,
  fhirIndex: FhirIndex,
) => {
  const patient = getPatient(fhirIndex);

  const patientSex = toTitleCase(
    evaluateOne(patient, fhirPathMappings.patientGender),
  );
  const age = calculatePatientAge(patient);
  const parentGuardian =
    !age || age.years < 18
      ? [
          {
            title: "Parent/Guardian",
            value: formatPatientContactList(
              evaluateAll(fhirBundle, fhirPathMappings.patientGuardian),
            ),
          },
        ]
      : [];

  return evaluateData([
    {
      title: "Patient Name",
      value: evaluatePatientName(patient, false),
    },
    {
      title: "DOB",
      value: evaluatePatientDOB(patient),
    },
    {
      title: "Sex",
      // Unknown and Other sex options removed to be in compliance with Executive Order 14168
      value: censorGender(patientSex),
    },
    {
      title: "Race",
      value: evaluatePatientRace(patient),
    },
    {
      title: "Ethnicity",
      value: evaluatePatientEthnicity(patient),
    },
    {
      title: "Patient Address",
      value: formatCurrentAddress(
        evaluateAll(patient, fhirPathMappings.patientAddressList),
      ),
    },
    {
      title: "Patient Contact",
      value: formatContactPoint(
        evaluateAll(patient, fhirPathMappings.patientTelecom),
      ),
    },
    ...parentGuardian,
  ]);
};

/**
 * Evaluates and retrieves encounter details from the FHIR bundle using the provided path mappings.
 * @param fhirBundle - The FHIR bundle containing patient data.
 * @returns An array of encounter details objects containing title and value pairs.
 */
export const evaluateEcrSummaryEncounterDetails = (fhirBundle: Bundle) => {
  const encounter = evaluateOneReference<Encounter>(
    fhirBundle,
    fhirPathMappings.compositionEncounterRef,
  );

  return evaluateData([
    {
      title: "Encounter Date/Time",
      value: formatStartEndDateTime(encounter?.period),
    },
    {
      title: "Encounter Type",
      value: formatCoding(encounter?.class),
    },
    {
      title: "Encounter Diagnosis",
      value: evaluateEncounterDiagnosis(fhirBundle, encounter),
    },
    {
      title: "Facility Name",
      value: getLocationName(fhirBundle, encounter),
    },
    {
      title: "Facility Contact",
      value: formatContactPoint(
        evaluateOneReference<Organization>(
          encounter,
          fhirPathMappings.facilityOrgRef,
        )?.telecom,
      ),
    },
  ]);
};

/**
 * Evaluates and retrieves all condition details in a bundle.
 * @param fhirBundle - The FHIR bundle containing patient data.
 * @param fhirIndex - FHIR resources indexed by type & by ID
 * @param snomedCode - (Optional) The SNOMED code identifying the main snomed code.
 * @returns An array of condition summary objects.
 */
export const evaluateEcrSummaryConditionSummary = (
  fhirBundle: Bundle,
  fhirIndex: FhirIndex,
  snomedCode?: string,
): ConditionSummary[] => {
  const rrConditions = evaluateAll(fhirBundle, fhirPathMappings.rrConditions);
  const conditionsList: {
    [index: string]: { ruleSummaries: Set<string>; displayText: string };
  } = {};
  for (const observation of rrConditions) {
    const coding = observation?.valueCodeableConcept?.coding?.find(
      (coding) => coding.system === "http://snomed.info/sct",
    );

    const displayText =
      formatCodeableConcept(observation?.valueCodeableConcept) ??
      observation?.valueString ??
      "Unknown Condition";

    const conditionListKey = coding?.code ?? displayText;
    if (!conditionsList[conditionListKey]) {
      conditionsList[conditionListKey] = {
        ruleSummaries: new Set(),
        displayText,
      };
    }

    observation?.hasMember?.forEach((ref) => {
      const rrInfoObs: Observation | undefined = evaluateReference(
        fhirBundle,
        ref.reference,
      );
      const { rules } = getReportabilityRulesReasons(rrInfoObs);

      rules.forEach((rule: string) =>
        conditionsList[conditionListKey].ruleSummaries.add(rule),
      );
    });
  }

  const conditionSummaries: ConditionSummary[] = [];
  for (const conditionsListKey in conditionsList) {
    const conditionSummary: ConditionSummary = {
      title: conditionsList[conditionsListKey].displayText,
      snomed: conditionsListKey,
      conditionDetails: [
        {
          title: "RCKMS Rule Summary",
          toolTip:
            "Reason(s) that this eCR was sent for this condition. Corresponds to your jurisdiction's rules for routing eCRs in RCKMS (Reportable Condition Knowledge Management System).",
          value: (
            <div className="p-list">
              {[...conditionsList[conditionsListKey].ruleSummaries].map(
                (summary) => (
                  <p key={summary}>{summary}</p>
                ),
              )}
            </div>
          ),
        },
      ],
      immunizationDetails: evaluateEcrSummaryRelevantImmunizations(
        fhirBundle,
        fhirIndex,
        conditionsListKey,
      ),
      clinicalDetails: evaluateEcrSummaryRelevantClinicalDetails(
        fhirBundle,
        fhirIndex,
        conditionsListKey,
      ),
      labDetails: evaluateEcrSummaryRelevantLabResults(
        fhirBundle,
        fhirIndex,
        conditionsListKey,
        false,
      ),
    };

    if (conditionSummary.snomed === snomedCode) {
      conditionSummaries.unshift(conditionSummary);
    } else {
      conditionSummaries.push(conditionSummary);
    }
  }

  return conditionSummaries;
};

const getRelevantResources = <T extends DomainResource>(
  resource: T[],
  snomedCode: string,
): T[] => {
  return resource.filter((entry) =>
    entry.extension?.some(
      (ext) =>
        ext.url ===
          "https://reportstream.cdc.gov/fhir/StructureDefinition/condition-code" &&
        ext.valueCoding?.code === snomedCode,
    ),
  );
};

/**
 * Evaluates and retrieves relevant clinical details from the FHIR bundle using the provided SNOMED code and path mappings.
 * @param fhirBundle - The FHIR bundle containing patient data.
 * @param snomedCode - String containing the SNOMED code search parameter.
 * @returns An array of condition details objects containing title and value pairs.
 */
export const evaluateEcrSummaryRelevantClinicalDetails = (
  fhirBundle: Bundle,
  fhirIndex: FhirIndex,
  snomedCode: string,
): DisplayDataProps[] => {
  if (!snomedCode) {
    return [];
  }

  const problemsList = evaluateAll(fhirBundle, fhirPathMappings.activeProblems);
  const problemsListFiltered = getRelevantResources(problemsList, snomedCode);

  if (problemsListFiltered.length === 0) {
    return [];
  }

  const problemsElement = returnProblemsTable(
    fhirBundle,
    fhirIndex,
    problemsListFiltered as Condition[],
  );

  return [{ value: problemsElement, dividerLine: true }];
};

/**
 * Evaluates and retrieves relevant lab results from the FHIR bundle using the provided SNOMED code and path mappings.
 * @param fhirBundle - The FHIR bundle containing patient data.
 * @param fhirIndex - FHIR resources indexed by type & by ID
 * @param snomedCode - String containing the SNOMED code search parameter.
 * @param lastDividerLine - Boolean to determine if a divider line should be added to the end of the lab results. Default to true
 * @returns An array of lab result details objects containing title and value pairs.
 */
export const evaluateEcrSummaryRelevantLabResults = (
  fhirBundle: Bundle,
  fhirIndex: FhirIndex,
  snomedCode: string,
  lastDividerLine: boolean = true,
): DisplayDataProps[] => {
  let resultsArray: DisplayDataProps[] = [];

  if (!snomedCode) {
    return [];
  }

  const labReports = getResourcesByType<DiagnosticReport>(
    fhirIndex,
    "DiagnosticReport",
  );
  const labsWithCode = getRelevantResources(labReports, snomedCode);
  const labsWithCodeIds = new Set(labsWithCode.map((lab) => lab.id));

  const observationsList = getResourcesByType<Observation>(
    fhirIndex,
    "Observation",
  );
  const relevantObsIds = new Set(
    getRelevantResources(observationsList, snomedCode).map((entry) => entry.id),
  );

  const labsFromObsWithCode = labReports.filter((lab) => {
    // already accounted for - skip
    if (labsWithCodeIds.has(lab.id)) {
      return false;
    }

    return lab.result?.some((result) => {
      if (result.reference) {
        const referenceId = result.reference.replace(/^Observation\//, "");
        return relevantObsIds.has(referenceId);
      }
    });
  });

  const relevantLabs = labsWithCode.concat(labsFromObsWithCode);

  if (relevantLabs.length === 0) {
    return [];
  }
  const relevantLabElements = evaluateLabInfoData(
    fhirIndex,
    relevantLabs,
    "h4",
  );

  resultsArray = relevantLabElements.flatMap((element) =>
    element.diagnosticReportDataItems.map((reportItem) => ({
      value: <LabAccordion items={[reportItem]} />,
      dividerLine: false,
    })),
  );

  if (lastDividerLine) {
    resultsArray.push({ dividerLine: true });
  }
  return resultsArray;
};

const evaluateEcrSummaryRelevantImmunizations = (
  fhirBundle: Bundle,
  fhirIndex: FhirIndex,
  snomedCode: string,
): DisplayDataProps[] => {
  const immunizations = getResourcesByType<Immunization>(fhirIndex, "Immunization");
  const stampedImmunizations = evaluateAll(
    immunizations,
    fhirPathMappings.stampedImmunizations,
    {
      snomedCode,
    },
  );
  const immunizationTable = returnImmunizations(
    fhirBundle,
    stampedImmunizations,
    "Immunizations Relevant to Reportable Condition",
    "caption-data-title caption-width-full",
  );
  return immunizationTable
    ? [
        {
          value: immunizationTable,
          dividerLine: true,
        },
      ]
    : [];
};
