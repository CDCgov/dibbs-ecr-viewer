import { evaluateRuleSummaries } from "@/app/services/reportabilityService";
import { Observation } from "fhir/r4";

describe("ReportabilityService", () => {
  describe("Evaluate Rule Summaries", () => {
    it("should return the rule summaries", () => {
      const expected = ["Rule 1", "Rule 2"];
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
        ],
        resourceType: "Observation",
        code: {},
        status: "unknown",
      };
      const result = evaluateRuleSummaries(observation);

      expect(Array.from(result)).toEqual(expected);
    });
  });
});
