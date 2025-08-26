import { Bundle, Observation } from "fhir/r4";

import { formatCodeableConcept } from "@/app/services/formatService";
import {
  evaluateAll,
  evaluateReference,
  evaluateValue,
} from "@/app/utils/evaluate";
import fhirPathMappings from "@/app/utils/evaluate/fhir-paths";

export interface ReportableConditions {
  [condition: string]: ReportabilityInfo[];
}

export interface ReportabilityInfo {
  participants: Participant[];
  rules: Set<string>;
  reasons: Set<string>;
}

export interface Participant {
  name: string;
  role: string;
}

// TODO ANGELA: Add JSDoc
export const evaluateRRInfo = (
  fhirBundle: Bundle
): ReportableConditions => {
  const rrConditions = evaluateAll(fhirBundle, fhirPathMappings.rrConditions);
  const reportableConditionsList: ReportableConditions = {};

  for (const condition of rrConditions) {
    const name =
      formatCodeableConcept(condition.valueCodeableConcept) ??
      "Unknown Condition";
    const rrInfo: ReportabilityInfo[] = evaluateReportabilityInfo(
      fhirBundle,
      condition
    );

    if (!reportableConditionsList[name]) {
      reportableConditionsList[name] = [];
    }
    reportableConditionsList[name].push(...rrInfo);
  }
  return reportableConditionsList;
};

/**
 * Finds all unique RCKMS rule summaries in an observation
 * @param fhirBundle - FHIR Bundle
 * @param observation - FHIR Observation of an RR Condition
 * @returns Set of rule summaries
 */
export const evaluateReportabilityInfo = (
  fhirBundle: Bundle,
  observation: Observation
): ReportabilityInfo[] => {
  const rrInfoArr: ReportabilityInfo[] = [];

  observation?.hasMember?.forEach((ref) => {
    const rrInfoObs: Observation | undefined = evaluateReference(
      fhirBundle,
      ref.reference
    );
    const participants = getResponsibleAgencies(fhirBundle, rrInfoObs);
    const { rules, reasons } = getReportabilityRulesReasons(rrInfoObs);

    rrInfoArr.push({ participants, rules, reasons });
  });

  return rrInfoArr;
};

/**
 * Finds all Determination of Reportability Rules and Reasons in an observation
 * @param observation - FHIR Observation
 * @returns Object of rules and reasons arrays
 */
export const getReportabilityRulesReasons = (
  observation: Observation | undefined
): { rules: Set<string>; reasons: Set<string> } => {
  const rules = new Set<string>();
  const reasons = new Set<string>();

  observation?.extension?.forEach((extension) => {
    if (
      extension.url ===
        "http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-determination-of-reportability-rule-extension" &&
      extension?.valueString?.trim()
    ) {
      rules.add(extension.valueString.trim());
    } else if (
      extension.url ===
        "http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-determination-of-reportability-reason-extension" &&
      extension?.valueString?.trim()
    ) {
      reasons.add(extension.valueString.trim());
    }
  });
  return { rules, reasons };
};

/**
 * Finds all responsible agencies involved with the eCR.
 * Possible participants: Routing Entity, Rules Authoring Agency, Responsible Agency
 * @param fhirBundle - FHIR Bundle
 * @param observation - FHIR Observation (RR Info Organizer)
 * @returns Array of objects containing the name & role of each responsible agency
 */
const getResponsibleAgencies = (
  fhirBundle: Bundle,
  observation: Observation | undefined
): Participant[] => {
  const participants: Participant[] = [];

  observation?.performer?.forEach((perfRef) => {
    const performer = evaluateReference(fhirBundle, perfRef.reference);
    const name = evaluateValue(performer, fhirPathMappings.name);
    const role = evaluateValue(performer, fhirPathMappings.organizationType);

    participants.push({ name, role });
  });

  return participants;
};

// TODO ANGELA: DELETE
/**
 * Finds all unique RCKMS rule summaries in an observation
 * @param fhirBundle - FHIR Bundle
 * @param observation - FHIR Observation
 * @returns Set of rule summaries
 */
export const getReportabilitySummaries = (
  fhirBundle: Bundle,
  observation: Observation
): Set<string> => {
  const ruleSummaries = new Set<string>();
  observation?.hasMember?.forEach((ref) => {
    const rrInfoObs: Observation | undefined = evaluateReference(
      fhirBundle,
      ref.reference
    );
    rrInfoObs?.extension?.forEach((extension) => {
      if (
        extension.url ===
          "http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-determination-of-reportability-rule-extension" &&
        extension?.valueString?.trim()
      ) {
        ruleSummaries.add(extension.valueString.trim());
      }
    });
  });
  return ruleSummaries;
};
