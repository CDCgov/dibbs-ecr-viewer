import {
  Address,
  Bundle,
  Condition,
  DiagnosticReport,
  Observation,
} from "fhir/r4";
import { evaluateData, PathMappings } from "@/app/view-data/utils/utils";
import {
  formatAddress,
  formatContactPoint,
  formatDate,
  formatPhoneNumber,
  formatStartEndDateTime,
  toTitleCase,
} from "@/app/services/formatService";
import { evaluate } from "@/app/view-data/utils/evaluate";
import {
  evaluatePatientName,
  evaluateEncounterDiagnosis,
} from "./evaluateFhirDataService";
import { DisplayDataProps } from "@/app/view-data/components/DataDisplay";
import {
  returnImmunizations,
  returnProblemsTable,
} from "@/app/view-data/components/common";
import { evaluateLabInfoData, isLabReportElementDataList } from "./labsService";
import { ConditionSummary } from "@/app/view-data/components/EcrSummary";
import React from "react";

/**
 * Evaluates and retrieves patient details from the FHIR bundle using the provided path mappings.
 * @param fhirBundle - The FHIR bundle containing patient data.
 * @param fhirPathMappings - Object containing fhir path mappings.
 * @returns An array of patient details objects containing title and value pairs.
 */
export const evaluateEcrSummaryPatientDetails = (
  fhirBundle: Bundle,
  fhirPathMappings: PathMappings,
) => {
  const patientSex = toTitleCase(
    evaluate(fhirBundle, fhirPathMappings.patientGender)[0],
  );

  return evaluateData([
    {
      title: "Patient Name",
      value: evaluatePatientName(fhirBundle, fhirPathMappings, false),
    },
    {
      title: "DOB",
      value:
        formatDate(evaluate(fhirBundle, fhirPathMappings.patientDOB)[0]) || "",
    },
    {
      title: "Sex",
      // Unknown and Other sex options removed to be in compliance with Executive Order 14168
      value:
        patientSex && ["Male", "Female"].includes(patientSex) ? patientSex : "",
    },
    {
      title: "Patient Address",
      value: findCurrentAddress(
        evaluate(fhirBundle, fhirPathMappings.patientAddressList),
      ),
    },
    {
      title: "Patient Contact",
      value: formatContactPoint(
        evaluate(fhirBundle, fhirPathMappings.patientTelecom),
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
    address = addresses.find((a) => a.use == "home");
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
 * @param fhirPathMappings - Object containing fhir path mappings.
 * @returns An array of encounter details objects containing title and value pairs.
 */
export const evaluateEcrSummaryEncounterDetails = (
  fhirBundle: Bundle,
  fhirPathMappings: PathMappings,
) => {
  return evaluateData([
    {
      title: "Encounter Date/Time",
      value: evaluateEncounterDate(fhirBundle, fhirPathMappings),
    },
    {
      title: "Encounter Type",
      value: evaluate(fhirBundle, fhirPathMappings.encounterType),
    },
    {
      title: "Encounter Diagnosis",
      value: evaluateEncounterDiagnosis(fhirBundle, fhirPathMappings),
    },
    {
      title: "Facility Name",
      value: evaluate(fhirBundle, fhirPathMappings.facilityName),
    },
    {
      title: "Facility Contact",
      value: formatPhoneNumber(
        evaluate(fhirBundle, fhirPathMappings.facilityContact)[0],
      ),
    },
  ]);
};

/**
 * Finds all unique RCKMS rule summaries in an observation
 * @param observation - FHIR Observation
 * @returns Set of rule summaries
 */
const evaluateRuleSummaries = (observation: Observation): Set<string> => {
  const ruleSummaries = new Set<string>();
  observation.extension?.forEach((extension) => {
    if (
      extension.url ===
        "http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-determination-of-reportability-rule-extension" &&
      extension?.valueString?.trim()
    ) {
      ruleSummaries.add(extension.valueString.trim());
    }
  });
  return ruleSummaries;
};

/**
 * Evaluates and retrieves all condition details in a bundle.
 * @param fhirBundle - The FHIR bundle containing patient data.
 * @param fhirPathMappings - Object containing fhir path mappings.
 * @param snomedCode - The SNOMED code identifying the main snomed code.
 * @returns An array of condition summary objects.
 */
export const evaluateEcrSummaryConditionSummary = (
  fhirBundle: Bundle,
  fhirPathMappings: PathMappings,
  snomedCode?: string,
): ConditionSummary[] => {
  const rrArray: Observation[] = evaluate(
    fhirBundle,
    fhirPathMappings.rrDetails,
  );
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
            observation?.valueCodeableConcept?.text || coding.display!,
        };
      }

      evaluateRuleSummaries(observation).forEach((ruleSummary) =>
        conditionsList[snomed].ruleSummaries.add(ruleSummary),
      );
    }
  }

  const conditionSummaries: ConditionSummary[] = [];
  for (let conditionsListKey in conditionsList) {
    const conditionSummary: ConditionSummary = {
      title: conditionsList[conditionsListKey].snomedDisplay,
      snomed: conditionsListKey,
      conditionDetails: [
        {
          title: "RCKMS Rule Summary",
          toolTip:
            "Reason(s) that this eCR was sent for this condition. Corresponds to your jurisdiction's rules for routing eCRs in RCKMS (Reportable Condition Knowledge Management System).",
          value: (
            <div className={"p-list"}>
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
        fhirPathMappings,
        conditionsListKey,
      ),
      clinicalDetails: evaluateEcrSummaryRelevantClinicalDetails(
        fhirBundle,
        fhirPathMappings,
        conditionsListKey,
      ),
      labDetails: evaluateEcrSummaryRelevantLabResults(
        fhirBundle,
        fhirPathMappings,
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

/**
 * Evaluates and retrieves relevant clinical details from the FHIR bundle using the provided SNOMED code and path mappings.
 * @param fhirBundle - The FHIR bundle containing patient data.
 * @param fhirPathMappings - Object containing fhir path mappings.
 * @param snomedCode - String containing the SNOMED code search parameter.
 * @returns An array of condition details objects containing title and value pairs.
 */
export const evaluateEcrSummaryRelevantClinicalDetails = (
  fhirBundle: Bundle,
  fhirPathMappings: PathMappings,
  snomedCode: string,
): DisplayDataProps[] => {
  const noData: string = "No matching clinical data found in this eCR";
  if (!snomedCode) {
    return [{ value: noData, dividerLine: true }];
  }

  const problemsList: Condition[] = evaluate(
    fhirBundle,
    fhirPathMappings["activeProblems"],
  );
  const problemsListFiltered = problemsList.filter(
    (entry) =>
      entry.extension?.some(
        (ext) =>
          ext.url ===
            "https://reportstream.cdc.gov/fhir/StructureDefinition/condition-code" &&
          ext.valueCoding?.code === snomedCode,
      ),
  );

  if (problemsListFiltered.length === 0) {
    return [{ value: noData, dividerLine: true }];
  }

  const problemsElement = returnProblemsTable(
    fhirBundle,
    problemsListFiltered as Condition[],
    fhirPathMappings,
  );

  return [{ value: problemsElement, dividerLine: true }];
};

/**
 * Evaluates and retrieves relevant lab results from the FHIR bundle using the provided SNOMED code and path mappings.
 * @param fhirBundle - The FHIR bundle containing patient data.
 * @param fhirPathMappings - Object containing fhir path mappings.
 * @param snomedCode - String containing the SNOMED code search parameter.
 * @param lastDividerLine - Boolean to determine if a divider line should be added to the end of the lab results. Default to true
 * @returns An array of lab result details objects containing title and value pairs.
 */
export const evaluateEcrSummaryRelevantLabResults = (
  fhirBundle: Bundle,
  fhirPathMappings: PathMappings,
  snomedCode: string,
  lastDividerLine: boolean = true,
): DisplayDataProps[] => {
  const noData: string = "No matching lab results found in this eCR";
  let resultsArray: DisplayDataProps[] = [];

  if (!snomedCode) {
    return [{ value: noData, dividerLine: true }];
  }

  const labReports: DiagnosticReport[] = evaluate(
    fhirBundle,
    fhirPathMappings["diagnosticReports"],
  );
  const labsWithCode = labReports.filter(
    (entry) =>
      entry.extension?.some(
        (ext) =>
          ext.url ===
            "https://reportstream.cdc.gov/fhir/StructureDefinition/condition-code" &&
          ext.valueCoding?.code === snomedCode,
      ),
  );

  const obsIdsWithCode: (string | undefined)[] = (
    evaluate(fhirBundle, fhirPathMappings["observations"]) as Observation[]
  )
    .filter(
      (entry) =>
        entry.extension?.some(
          (ext) =>
            ext.url ===
              "https://reportstream.cdc.gov/fhir/StructureDefinition/condition-code" &&
            ext.valueCoding?.code === snomedCode,
        ),
    )
    .map((entry) => entry.id);

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
    fhirPathMappings,
    "h4",
  );

  if (isLabReportElementDataList(relevantLabElements)) {
    resultsArray = relevantLabElements.flatMap((element) =>
      element.diagnosticReportDataElements.map((reportElement) => ({
        value: reportElement,
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
 * @param mappings - The object containing the fhir paths.
 * @returns A string of start date - end date.
 */
const evaluateEncounterDate = (fhirBundle: Bundle, mappings: PathMappings) => {
  return formatStartEndDateTime(
    evaluate(fhirBundle, mappings.encounterStartDate).join(""),
    evaluate(fhirBundle, mappings.encounterEndDate).join(""),
  );
};

const evaluateEcrSummaryRelevantImmunizations = (
  fhirBundle: Bundle,
  mappings: PathMappings,
  snomedCode: string,
): DisplayDataProps[] => {
  const immunizations = evaluate(fhirBundle, mappings.stampedImmunizations, {
    snomedCode,
  });
  const immunizationTable = returnImmunizations(
    fhirBundle,
    immunizations,
    mappings,
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
