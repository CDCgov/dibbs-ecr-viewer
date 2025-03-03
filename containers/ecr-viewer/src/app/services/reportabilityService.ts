import { Observation } from "fhir/r4";

/**
 * Finds all unique RCKMS rule summaries in an observation
 * @param observation - FHIR Observation
 * @returns Set of rule summaries
 */
export const getReportabilitySummaries = (
  observation: Observation,
): Set<string> => {
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
