import { Observation } from "fhir/r4";

import { getReportabilityRulesReasons } from "@/app/view-data/services/reportabilityService";

// TODO ANGELA: Add tests for other helper functions
describe("ReportabilityService", () => {
  it("getReportabilityRulesReasons should return the unique set of rule and reasons", () => {
    const expected = {
      rules: new Set(["Rule 1", "Rule 2"]),
      reasons: new Set(["Reason 1"]),
    };
    const observation: Observation = {
      extension: [
        {
          url: "http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-determination-of-reportability-rule-extension",
          valueString: "Rule 1",
        },
        {
          url: "http://example.com/something-else",
          valueString: "This should be ignored",
        },
        {
          url: "http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-determination-of-reportability-rule-extension",
          valueString: "Rule 2",
        },
        {
          url: "http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-determination-of-reportability-rule-extension",
          valueString: "Rule 2",
        },
        {
          url: "http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-determination-of-reportability-reason-extension",
          valueString: "Reason 1",
        },
      ],
      resourceType: "Observation",
      code: {},
      status: "unknown",
    };

    const result = getReportabilityRulesReasons(observation);

    expect(result).toEqual(expected);
  });
});
