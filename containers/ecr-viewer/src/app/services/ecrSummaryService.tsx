import React from "react";

import { Address, Bundle, Condition, DomainResource } from "fhir/r4";

import { evaluateData } from "@/app/utils/data-utils";
import { evaluateAll, evaluateOne } from "@/app/utils/evaluate";
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
  evaluateEncounterDiagnosis,
  getHumanReadableCodeableConcept,
  censorGender,
} from "./evaluateFhirDataService";
import { formatDate, formatStartEndDateTime } from "./formatDateService";
import {
  formatAddress,
  formatContactPoint,
  formatPhoneNumber,
} from "./formatService";
import { evaluateLabInfoData, isLabReportElementDataList } from "./labsService";
import { getReportabilitySummaries } from "./reportabilityService";

/**
 * Evaluates and retrieves patient details from the FHIR bundle using the provided path mappings.
 * @param fhirBundle - The FHIR bundle containing patient data.
 * @returns An array of patient details objects containing title and value pairs.
 */
export const evaluateEcrSummaryPatientDetails = (fhirBundle: Bundle) => {
  const patientSex = toTitleCase(
    evaluateOne(fhirBundle, fhirPathMappings.patientGender),
  );

  return evaluateData([
    {
      title: "Patient Name",
      value: evaluatePatientName(fhirBundle, false),
    },
    {
      title: "DOB",
      value: formatDate(evaluateOne(fhirBundle, fhirPathMappings.patientDOB)),
    },
    {
      title: "Sex",
      // Unknown and Other sex options removed to be in compliance with Executive Order 14168
      value: censorGender(patientSex),
    },
    {
      title: "Race",
      value: evaluatePatientRace(fhirBundle),
    },
    {
      title: "Ethnicity",
      value: evaluatePatientEthnicity(fhirBundle),
    },
    {
      title: "Patient Address",
      value: findCurrentAddress(
        evaluateAll(fhirBundle, fhirPathMappings.patientAddressList),
      ),
    },
    {
      title: "Patient Contact",
      value: formatContactPoint(
        evaluateAll(fhirBundle, fhirPathMappings.patientTelecom),
      ),
    },
  ]);
};

/**
 * Find the most current home address.
 * @param addresses - List of addresses.
 * @returns A string with the formatted current address or an empty string if no address.
 */
export const findCurrentAddress = (addresses: Address[]) => {
  // current home address is first pick
  let address = addresses.find(
    (a) => a.use === "home" && !!a.period?.start && !a.period?.end,
  );
  // then current address
  if (!address) {
    address = addresses.find((a) => !!a.period?.start && !a.period?.end);
  }

  // then home address
  if (!address) {
    address = addresses.find((a) => a.use === "home");
  }

  // then first address
  if (!address) {
    address = addresses[0];
  }

  return formatAddress(address);
};

/**
 * Evaluates and retrieves encounter details from the FHIR bundle using the provided path mappings.
 * @param fhirBundle - The FHIR bundle containing patient data.
 * @returns An array of encounter details objects containing title and value pairs.
 */
export const evaluateEcrSummaryEncounterDetails = (fhirBundle: Bundle) => {
  return evaluateData([
    {
      title: "Encounter Date/Time",
      value: evaluateEncounterDate(fhirBundle),
    },
    {
      title: "Encounter Type",
      value: evaluateOne(fhirBundle, fhirPathMappings.encounterType),
    },
    {
      title: "Encounter Diagnosis",
      value: evaluateEncounterDiagnosis(fhirBundle),
    },
    {
      title: "Facility Name",
      value: evaluateOne(fhirBundle, fhirPathMappings.facilityName),
    },
    {
      title: "Facility Contact",
      value: formatPhoneNumber(
        evaluateOne(fhirBundle, fhirPathMappings.facilityContact),
      ),
    },
  ]);
};

/**
 * Evaluates and retrieves all condition details in a bundle.
 * @param fhirBundle - The FHIR bundle containing patient data.
 * @param snomedCode - The SNOMED code identifying the main snomed code.
 * @returns An array of condition summary objects.
 */
export const evaluateEcrSummaryConditionSummary = (
  fhirBundle: Bundle,
  snomedCode?: string,
): ConditionSummary[] => {
  const rrArray = evaluateAll(fhirBundle, fhirPathMappings.rrDetails);
  const conditionsList: {
    [index: string]: { ruleSummaries: Set<string>; snomedDisplay: string };
  } = {};
  for (const observation of rrArray) {
    const coding = observation?.valueCodeableConcept?.coding?.find(
      (coding) => coding.system === "http://snomed.info/sct",
    );
    if (coding?.code) {
      const snomed = coding.code;
      if (!conditionsList[snomed]) {
        conditionsList[snomed] = {
          ruleSummaries: new Set(),
          snomedDisplay:
            getHumanReadableCodeableConcept(
              observation?.valueCodeableConcept,
            ) ?? "Unknown Condition",
        };
      }

      getReportabilitySummaries(observation).forEach((ruleSummary) =>
        conditionsList[snomed].ruleSummaries.add(ruleSummary),
      );
    }
  }

  const conditionSummaries: ConditionSummary[] = [];
  for (const conditionsListKey in conditionsList) {
    const conditionSummary: ConditionSummary = {
      title: conditionsList[conditionsListKey].snomedDisplay,
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
        conditionsListKey,
      ),
      clinicalDetails: evaluateEcrSummaryRelevantClinicalDetails(
        fhirBundle,
        conditionsListKey,
      ),
      labDetails: evaluateEcrSummaryRelevantLabResults(
        fhirBundle,
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
  return resource.filter(
    (entry) =>
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
  snomedCode: string,
): DisplayDataProps[] => {
  const noData: string = "No matching clinical data found in this eCR";
  if (!snomedCode) {
    return [{ value: noData, dividerLine: true }];
  }

  const problemsList = evaluateAll(fhirBundle, fhirPathMappings.activeProblems);
  const problemsListFiltered = getRelevantResources(problemsList, snomedCode);

  if (problemsListFiltered.length === 0) {
    return [{ value: noData, dividerLine: true }];
  }

  const problemsElement = returnProblemsTable(
    fhirBundle,
    problemsListFiltered as Condition[],
  );

  return [{ value: problemsElement, dividerLine: true }];
};

/**
 * Evaluates and retrieves relevant lab results from the FHIR bundle using the provided SNOMED code and path mappings.
 * @param fhirBundle - The FHIR bundle containing patient data.
 * @param snomedCode - String containing the SNOMED code search parameter.
 * @param lastDividerLine - Boolean to determine if a divider line should be added to the end of the lab results. Default to true
 * @returns An array of lab result details objects containing title and value pairs.
 */
export const evaluateEcrSummaryRelevantLabResults = (
  fhirBundle: Bundle,
  snomedCode: string,
  lastDividerLine: boolean = true,
): DisplayDataProps[] => {
  const noData: string = "No matching lab results found in this eCR";
  let resultsArray: DisplayDataProps[] = [];

  if (!snomedCode) {
    return [{ value: noData, dividerLine: true }];
  }

  const labReports = evaluateAll(
    fhirBundle,
    fhirPathMappings.diagnosticReports,
  );
  const labsWithCode = getRelevantResources(labReports, snomedCode);

  const observationsList = evaluateAll(
    fhirBundle,
    fhirPathMappings.observations,
  );
  const obsIdsWithCode: (string | undefined)[] = getRelevantResources(
    observationsList,
    snomedCode,
  ).map((entry) => entry.id);

  const labsFromObsWithCode = (() => {
    const obsIds = new Set(obsIdsWithCode);
    const labsWithCodeIds = new Set(labsWithCode.map((lab) => lab.id));

    return labReports.filter((lab) => {
      if (labsWithCodeIds.has(lab.id)) {
        return false;
      }

      return lab.result?.some((result) => {
        if (result.reference) {
          const referenceId = result.reference.replace(/^Observation\//, "");
          return obsIds.has(referenceId);
        }
      });
    });
  })();

  const relevantLabs = labsWithCode.concat(labsFromObsWithCode);

  if (relevantLabs.length === 0) {
    return [{ value: noData, dividerLine: true }];
  }
  const relevantLabElements = evaluateLabInfoData(
    fhirBundle,
    relevantLabs,
    "h4",
  );

  if (isLabReportElementDataList(relevantLabElements)) {
    resultsArray = relevantLabElements.flatMap((element) =>
      element.diagnosticReportDataItems.map((reportItem) => ({
        value: <LabAccordion items={[reportItem]} />,
        dividerLine: false,
      })),
    );
  } else {
    resultsArray.push(...relevantLabElements);
  }

  if (lastDividerLine) {
    resultsArray.push({ dividerLine: true });
  }
  return resultsArray;
};

/**
 * Evaluates encounter date from the FHIR bundle and formats it into structured data for display.
 * @param fhirBundle - The FHIR bundle containing encounter date.
 * @returns A string of start date - end date.
 */
const evaluateEncounterDate = (fhirBundle: Bundle) => {
  return formatStartEndDateTime(
    evaluateOne(fhirBundle, fhirPathMappings.encounterStartDate),
    evaluateOne(fhirBundle, fhirPathMappings.encounterEndDate),
  );
};

const evaluateEcrSummaryRelevantImmunizations = (
  fhirBundle: Bundle,
  snomedCode: string,
): DisplayDataProps[] => {
  const immunizations = evaluateAll(
    fhirBundle,
    fhirPathMappings.stampedImmunizations,
    {
      snomedCode,
    },
  );
  const immunizationTable = returnImmunizations(
    fhirBundle,
    immunizations,
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
