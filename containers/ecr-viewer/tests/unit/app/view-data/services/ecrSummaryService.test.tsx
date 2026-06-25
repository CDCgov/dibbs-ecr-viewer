import React from "react";

import { render, screen } from "@testing-library/react";
import { Bundle } from "fhir/r4";

import _BundleWithClinicalInfo from "../../../../../../../test-data/fhir/BundleClinicalInfo.json";
import _BundleEcrSummary from "../../../../../../../test-data/fhir/BundleEcrSummary.json";
import _BundleEcrMetadata from "../../../../../../../test-data/fhir/BundleEcrMetadata.json";
import _BundleLab from "../../../../../../../test-data/fhir/BundleLab.json";
import _BundlePatient from "../../../../../../../test-data/fhir/BundlePatient.json";
import _BundleRRConditionValueString from "../../../../../../../test-data/fhir/BundleRRConditionValueString.json";
import {
  evaluateEcrSummaryConditionSummary,
  evaluateEcrSummaryEncounterDetails,
  evaluateEcrSummaryPatientDetails,
  evaluateEcrSummaryRelevantClinicalDetails,
  evaluateEcrSummaryRelevantLabResults,
} from "@/app/view-data/services/ecrSummaryService";
import {
  FhirIndex,
  getFhirIndex,
} from "@/app/view-data/services/fhirResourcesIndexService";
import { evaluateData, noDataSummary } from "@/app/utils/data-utils";

const BundleLab = _BundleLab as unknown as Bundle;
const fhirIndexBundleLab = getFhirIndex(BundleLab);

const BundleEcrSummary = _BundleEcrSummary as unknown as Bundle;
const fhirIndexBundleEcrSummary = getFhirIndex(BundleEcrSummary);

const BundleEcrMetadata = _BundleEcrMetadata as unknown as Bundle;

const BundleRRConditionValueString =
  _BundleRRConditionValueString as unknown as Bundle;
const fhirIndexBundleRRConditionValueString = getFhirIndex(
  BundleRRConditionValueString,
);

const BundlePatient = _BundlePatient as unknown as Bundle;
const fhirIndexBundlePatient = getFhirIndex(BundlePatient);

const BundleWithClinicalInfo = _BundleWithClinicalInfo as unknown as Bundle;
const fhirIndexBundleWithClinicalInfo = getFhirIndex(BundleWithClinicalInfo);

describe("ecrSummaryService Tests", () => {
  describe("Evaluate eCR Summary Relevant Clinical Details", () => {
    it("should return an empty list when no SNOMED code is provided", () => {
      const actual = evaluateEcrSummaryRelevantClinicalDetails(
        BundleWithClinicalInfo,
        fhirIndexBundleWithClinicalInfo,
        "",
      );

      expect(actual).toBeEmpty();
    });

    it("should return an empty list when the provided SNOMED code has no matches", () => {
      const actual = evaluateEcrSummaryRelevantClinicalDetails(
        BundleWithClinicalInfo,
        fhirIndexBundleWithClinicalInfo,
        "invalid-snomed-code",
      );

      expect(actual).toBeEmpty();
    });

    it("should return the correct active problem when the provided SNOMED code matches", () => {
      const result = evaluateEcrSummaryRelevantClinicalDetails(
        BundleWithClinicalInfo,
        fhirIndexBundleWithClinicalInfo,
        "263133002",
      );
      expect(result).toHaveLength(1);

      render(result[0].value);
      expect(screen.getByRole("table")).toBeInTheDocument();
      expect(
        screen.getByText("Sprain of calcaneofibular ligament of right ankle"),
      ).toBeInTheDocument();
      expect(screen.getByText("08/02/2018")).toBeInTheDocument();

      // Active problem(s) without a matching SNOMED code should not be included
      expect(screen.queryByText("Knee pain")).not.toBeInTheDocument();
    });
  });

  describe("Evaluate eCR Summary Relevant Lab Results", () => {
    it("should return an empty list when no SNOMED code is provided", () => {
      const actual = evaluateEcrSummaryRelevantLabResults(
        BundleLab,
        fhirIndexBundleLab,
        "",
      );

      expect(actual).toBeEmpty();
    });

    it("should return 'No Data' string when the provided SNOMED code has no matches", () => {
      const actual = evaluateEcrSummaryRelevantLabResults(
        BundleLab,
        fhirIndexBundleLab,
        "invalid-snomed-code",
      );

      expect(actual).toBeEmpty();
    });

    it("should return the correct lab result(s) when the provided SNOMED code matches", () => {
      const result = evaluateEcrSummaryRelevantLabResults(
        BundleLab,
        fhirIndexBundleLab,
        "test-snomed",
      );
      expect(result).toHaveLength(3); // 2 results, plus last item is divider line

      render(result[0].value);
      expect(screen.getByRole("button")).toBeInTheDocument();
      expect(
        screen.getByText("STOOL PATHOGENS, NAAT, 12 TO 25 TARGETS"),
      ).toBeInTheDocument();
      expect(screen.getAllByText("09/28/2000 5:00 PM EDT")).toHaveLength(1);

      render(result[1].value);
      expect(
        screen.getByText("Cytogenomic SNP microarray"),
      ).toBeInTheDocument();
    });

    it("should not include the last empty divider line when lastDividerLine is false", () => {
      const result = evaluateEcrSummaryRelevantLabResults(
        BundleLab,
        fhirIndexBundleLab,
        "test-snomed",
        false,
      );

      expect(result).toHaveLength(2);
    });
  });

  describe("Evaluate eCR Summary Condition Summary", () => {
    it("should return titles based on snomed code, and return human-readable name if available", () => {
      const actual = evaluateEcrSummaryConditionSummary(
        BundleEcrSummary,
        fhirIndexBundleEcrSummary,
      );

      expect(actual[0].title).toEqual("Hepatitis C");
      expect(actual[1].title).toEqual(
        "Disease caused by severe acute respiratory syndrome coronavirus 2 (disorder)",
      );
    });
    it("should return human-readable name if available", () => {
      const actual = evaluateEcrSummaryConditionSummary(
        BundleRRConditionValueString,
        fhirIndexBundleRRConditionValueString,
      );

      expect(actual[0].title).toEqual("COVID");
    });
    it("should return summaries based on snomed code", () => {
      const actual = evaluateEcrSummaryConditionSummary(
        BundleEcrSummary,
        fhirIndexBundleEcrSummary,
      );
      render(
        actual[1].conditionDetails.map((detail, i) => (
          <React.Fragment key={`${i}`}>{detail.value}</React.Fragment>
        )),
      );

      expect(
        screen.queryByText(
          "Detection of Hepatitis C virus antibody in a clinical specimen by any method",
        ),
      ).not.toBeInTheDocument();
      expect(
        screen.getByText("COVID-19 (as a diagnosis or active problem)"),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "Detection of SARS-CoV-2 nucleic acid in a clinical or post-mortem specimen by any method",
        ),
      ).toBeInTheDocument();
    });
    it("should return clinical details based on snomed code", () => {
      const actual = evaluateEcrSummaryConditionSummary(
        BundleEcrSummary,
        fhirIndexBundleEcrSummary,
      );

      render(
        actual[1].clinicalDetails.map((detail) => (
          <div key={Math.random()}>{detail.value}</div>
        )),
      );

      expect(screen.getByText("COVID toes")).toBeInTheDocument();
    });
    it("should return lab details based on snomed code", () => {
      const actual = evaluateEcrSummaryConditionSummary(
        BundleEcrSummary,
        fhirIndexBundleEcrSummary,
      );

      render(
        actual[1].labDetails.map((detail) => (
          <React.Fragment key={Math.random()}>{detail.value}</React.Fragment>
        )),
      );

      expect(
        screen.queryByText("No matching lab results found in this eCR"),
      ).not.toBeInTheDocument();
      expect(screen.getByText("SARS-CoV-2 PCR")).toBeInTheDocument();
    });
    it("should return immunization details based on snomed code", () => {
      const actual = evaluateEcrSummaryConditionSummary(
        BundleEcrSummary,
        fhirIndexBundleEcrSummary,
      );
      render(
        actual[1].immunizationDetails.map((detail) => (
          <React.Fragment key={Math.random()}>{detail.value}</React.Fragment>
        )),
      );

      expect(screen.getByText("SARS-CoV-2 PCR Vaccine")).toBeInTheDocument();
    });
    it("should not display non-related immunization details", () => {
      const BundleNonRelatedImmuns = {
        ..._BundleEcrSummary,
        entry: [
          ..._BundleEcrSummary.entry,
          {
            fullUrl: "urn:uuid:6689c3f5-f256-9c28-bd98-89905630f28d",
            resource: {
              resourceType: "Immunization",
              vaccineCode: {
                coding: [
                  {
                    code: "24",
                    system: "urn:oid:2.16.840.1.113883.12.292",
                    display: "anthrax",
                  },
                ],
              },
              extension: [
                {
                  url: "https://reportstream.cdc.gov/fhir/StructureDefinition/condition-code",
                  valueCoding: [
                    {
                      code: "722545003",
                      system: "http://snomed.info/sct",
                    },
                  ],
                },
              ],
            },
          },
        ],
      } as unknown as Bundle;
      const fhirIndexBundleNonRelatedImmuns = getFhirIndex(
        BundleNonRelatedImmuns,
      );
      const actual = evaluateEcrSummaryConditionSummary(
        BundleNonRelatedImmuns,
        fhirIndexBundleNonRelatedImmuns,
      );
      render(
        actual[1].immunizationDetails.map((detail) => (
          <React.Fragment key={Math.random()}>{detail.value}</React.Fragment>
        )),
      );

      expect(screen.getByText("SARS-CoV-2 PCR Vaccine")).toBeInTheDocument();
      expect(screen.queryByText("anthrax")).not.toBeInTheDocument();
    });
    it("should return empty array if none found", () => {
      const actual = evaluateEcrSummaryConditionSummary(
        {} as Bundle,
        {} as FhirIndex,
      );

      expect(actual).toBeEmpty();
    });
    it("should return the the requested snomed first", () => {
      const verifyNotFirst = evaluateEcrSummaryConditionSummary(
        BundleEcrSummary,
        fhirIndexBundleEcrSummary,
      );

      expect(verifyNotFirst[0].title).not.toEqual(
        "Disease caused by severe acute respiratory syndrome coronavirus 2 (disorder)",
      );

      const actual = evaluateEcrSummaryConditionSummary(
        BundleEcrSummary,
        fhirIndexBundleEcrSummary,
        "840539006",
      );
      expect(actual[0].title).toEqual(
        "Disease caused by severe acute respiratory syndrome coronavirus 2 (disorder)",
      );
    });
  });

  describe("Evaluate eCR Summary Patient Details", () => {
    it("should get all relevant patient details", () => {
      const actual = evaluateEcrSummaryPatientDetails(
        BundlePatient,
        fhirIndexBundlePatient,
      );

      expect(evaluateData(actual).unavailableData).toBeEmpty();
    });

    it("should not show parent/guardian info if adult", () => {
      const actual = evaluateEcrSummaryPatientDetails(
        BundlePatient,
        fhirIndexBundlePatient,
      );

      const guardian = actual.find((d) => d.title === "Parent/Guardian");

      expect(guardian).toBeUndefined();
    });

    it("should show parent/guardian info if minor", () => {
      const bundle = {
        resourceType: "Bundle",
        type: "batch",
        entry: [
          {
            fullUrl: "urn:uuid:99999999-4p89-4b96-b6ab-c46406839cea",
            resource: {
              ...BundlePatient.entry!.at(0)?.resource,
              birthDate: "2025-01-01",
            },
          },
          ...BundlePatient.entry!.slice(1),
        ],
      } as unknown as Bundle;
      const fhirIndexBundle = getFhirIndex(bundle);
      const actual = evaluateEcrSummaryPatientDetails(bundle, fhirIndexBundle);

      const guardian = actual.find((d) => d.title === "Parent/Guardian");

      expect(guardian?.value).toEqual(
        `Grandparent\nLuthen Rael\n1357 Galactic Drive\nSometown, OR 94949\nUS\nHome: 123-456-6909`,
      );
    });

    it("should display noData if no patient details are available", () => {
      const BundlePatientEmpty = {
        resourceType: "Bundle",
        type: "document",
        entry: [
          {
            fullUrl: "urn:uuid:99999999-4p89-4b96-b6ab-c46406839cea",
            resource: {
              resourceType: "Patient",
              id: "99999999-4p89-4b96-b6ab-c46406839cea",
              meta: {
                profile: [
                  "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient",
                ],
                source: ["ecr"],
              },
              identifier: [
                {
                  system: "urn:oid:0.0.000.000000.0.00.000.0.0.0.000000.000",
                  value: "1234567890",
                },
              ],
            },
          },
        ],
      } as unknown as Bundle;
      const fhirIndexPatientEmpty = getFhirIndex(BundlePatientEmpty);
      const actual = evaluateEcrSummaryPatientDetails(
        BundlePatientEmpty,
        fhirIndexPatientEmpty,
      );
      actual.forEach((a) => {
        expect(a.value === noDataSummary);
      });
    });
  });

  describe("Evaluate eCR Summary Encounter Details", () => {
    it("should get all relevant encounter details", () => {
      const actual = evaluateEcrSummaryEncounterDetails(BundleEcrMetadata);
      expect(evaluateData(actual).unavailableData).toBeEmpty();
    });

    it("should display noData if no patient details are available", () => {
      const BundleEncounterEmpty = {
        resourceType: "Bundle",
        type: "document",
        entry: [
          {
            fullUrl: "urn:uuid:99999999-4p89-4b96-b6ab-c46406839cea",
            resource: {
              resourceType: "Encounter",
              id: "99999999-4p89-4b96-b6ab-c46406839cea",
              meta: {
                profile: [
                  "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient",
                ],
                source: ["ecr"],
              },
              identifier: [
                {
                  system: "urn:oid:0.0.000.000000.0.00.000.0.0.0.000000.000",
                  value: "1234567890",
                },
              ],
            },
          },
        ],
      } as unknown as Bundle;
      const actual = evaluateEcrSummaryEncounterDetails(BundleEncounterEmpty);
      actual.forEach((a) => {
        expect(a.value === noDataSummary);
      });
    });
  });
});
