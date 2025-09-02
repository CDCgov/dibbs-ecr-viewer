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

/**
 * Evaluates all reportable conditions and retrieves its associated 
 * reportability information. Includes: Determination of reportability 
 * rules and reasons, participants (name and role)
 * @param fhirBundle - FHIR Bundle
 * @returns An object mapping condition names to an array of
 * their associated reportability information.
 */
export const evaluateRRInfo = (
  fhirBundle: Bundle
): ReportableConditions => {
  const rrConditions = evaluateAll(fhirBundle, fhirPathMappings.rrConditions);
  const reportableConditionsList: ReportableConditions = {};

  for (const condition of rrConditions) {
    const name =
      formatCodeableConcept(condition.valueCodeableConcept) ??
      "Unknown Condition";
    const rrInfo: ReportabilityInfo[] = []
    
    condition?.hasMember?.forEach(
      (ref) => {
        const rrInfoObs: Observation | undefined = evaluateReference(
          fhirBundle,
          ref.reference
        );
        console.log(rrInfoObs)
        const participants = getResponsibleAgencies(fhirBundle, rrInfoObs);
        const { rules, reasons } = getReportabilityRulesReasons(rrInfoObs);

        rrInfo.push({ participants, rules, reasons });
      }
    );
    
    if (!reportableConditionsList[name]) {
      reportableConditionsList[name] = [];
    }
    reportableConditionsList[name].push(...rrInfo);
  }
  return reportableConditionsList;
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
export const getResponsibleAgencies = (
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