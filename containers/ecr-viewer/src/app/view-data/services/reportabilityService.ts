import { Bundle, Observation } from "fhir/r4";

import { evaluateReference, evaluateValue } from "@/app/utils/evaluate";
import fhirPathMappings from "@/app/utils/evaluate/fhir-paths";

import { Participant, ReportabilityInfo } from "./ecrMetadataService";

/**
 * Finds all unique RCKMS rule summaries in an observation
 * @param fhirBundle - FHIR Bundle
 * @param observation - FHIR Observation of an RR Condition
 * @returns Set of rule summaries
 */
export const getReportabilityInfo = (
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

    rrInfoArr.push({participants, rules, reasons})
  });

  return rrInfoArr
};

/**
 * Finds all Determination of Reportability Rules and Reasons in an observation
 * @param observation - FHIR Observation
 * @returns Object of rules and reasons arrays
 */
const getReportabilityRulesReasons = (observation: Observation | undefined): {rules: string[], reasons: string[]} => {
  // TODO ANGELA: should these be a set?
  const rules: string[] = [];
  const reasons: string[] = [];

  observation?.extension?.forEach((extension) => {
    if (
      extension.url ===
        "http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-determination-of-reportability-rule-extension" &&
      extension?.valueString?.trim()
    ) {
      rules.push(extension.valueString.trim());
    }
    else if (
      extension.url ===
        "http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-determination-of-reportability-reason-extension" &&
      extension?.valueString?.trim()
    ) {
      reasons.push(extension.valueString.trim());
    }
  });
  return {rules, reasons}
}

/**
 * Finds all responsible agencies involved with the eCR.
 * Possible participants: Routing Entity, Rules Authoring Agency, Responsible Agency
 * @param fhirBundle - FHIR Bundle
 * @param observation - FHIR Observation (RR Info Organizer)
 * @returns Array of objects containing the name & role of each responsible agency
 */
const getResponsibleAgencies = (fhirBundle: Bundle, observation: Observation | undefined): Participant[] => {
  const participants: Participant[] = []

  observation?.performer?.forEach((perfRef) => {
    const performer = evaluateReference(fhirBundle, perfRef.reference)
    const name = evaluateValue(performer, fhirPathMappings.name);
    const role = evaluateValue(performer, fhirPathMappings.organizationType);

    participants.push({name, role})
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
  observation: Observation,
): Set<string> => {
  const ruleSummaries = new Set<string>();
  observation?.hasMember?.forEach((ref) => {
    const rrInfoObs: Observation | undefined = evaluateReference(fhirBundle, ref.reference);
    rrInfoObs?.extension?.forEach((extension) => {
      if (
        extension.url ===
          "http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-determination-of-reportability-rule-extension" &&
        extension?.valueString?.trim()
      ) {
        ruleSummaries.add(extension.valueString.trim());
      }

      // TODO ANGELA: Add routing entity(s) for each rule
    });


  });
  return ruleSummaries;
};