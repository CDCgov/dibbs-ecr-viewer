import { Bundle, Observation } from "fhir/r4";

import BundleEcrMetadata from "@/../../../test-data/fhir/BundleEcrMetadata.json";
import {
  evaluateRRInfo,
  getReportabilityRulesReasons,
  getResponsibleAgencies,
  Participant,
} from "@/app/view-data/services/reportabilityService";

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

  it("getResponsibleAgencies should return correct participant and role", () => {
    const expected: Participant[] = [
      {
        name: "Anchorhead Department of Public Health",
        role: "Routing Entity",
      },
    ];

    const observation: Observation = {
      performer: [
        {
          reference: "Organization/1b6cfb7e-4f61-a8e0-2267-FAKE3de49935",
          display: "Anchorhead Department of Public Health",
        },
      ],
      resourceType: "Observation",
      code: {},
      status: "unknown",
    };

    const result = getResponsibleAgencies(
      BundleEcrMetadata as unknown as Bundle,
      observation,
    );

    expect(result).toEqual(expected);
  });

  it("evaluateRRInfo should return a map of all RR info associated with the reportable conditions in a bundle", () => {
    const expected = {
      "Disease caused by severe acute respiratory syndrome coronavirus 2 (disorder)":
        [
          {
            participants: [
              {
                name: "Mos Espa Department of Health",
                role: "Routing Entity",
              },
            ],
            reasons: new Set(),
            rules: new Set([
              "COVID-19 (as a diagnosis or active problem)",
              "Detection of SARS-CoV-2 nucleic acid in a clinical or post-mortem specimen by any method",
            ]),
          },
        ],
      "Hepatitis C": [
        {
          participants: [
            {
              name: "Anchorhead Department of Public Health",
              role: "Routing Entity",
            },
          ],
          reasons: new Set(),
          rules: new Set([
            "Detection of Hepatitis C virus antibody in a clinical specimen by any method",
          ]),
        },
      ],
    };

    const result = evaluateRRInfo(BundleEcrMetadata as unknown as Bundle);
    expect(result).toEqual(expected);
  });

  it("evaluateRRInfo should return Unknown Condition cannot evaluate RR condition name ", () => {
    const expected = { "Unknown Condition": [] };
    const bundle: Bundle = {
      resourceType: "Bundle",
      type: "batch",
      entry: [
        {
          "resource": {
            "resourceType": "Observation",
            "meta": {
              "profile": [
                "http://hl7.org/fhir/us/ecr/StructureDefinition/rr-relevant-reportable-condition-observation"
              ],
              "source": "ecr"
            },
            "status": "final",
            "code": {
              "coding": [
                {
                  "code": "64572001",
                  "display": "Condition",
                  "system": "http://snomed.info/sct"
                },
                {
                  "code": "75323-6",
                  "display": "Condition",
                  "system": "http://loinc.org"
                }
              ]
            },
            "valueCodeableConcept": {},
          },
        },
      ]
    };

    const result = evaluateRRInfo(bundle)
    expect(result).toEqual(expected)
  });
});
