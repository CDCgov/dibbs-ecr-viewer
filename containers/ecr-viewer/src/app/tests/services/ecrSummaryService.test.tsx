import { loadYamlConfig } from "@/app/api/utils";
import {
  evaluateEcrSummaryConditionSummary,
  evaluateEcrSummaryRelevantClinicalDetails,
} from "@/app/services/ecrSummaryService";
import BundleWithClinicalInfo from "@/app/tests/assets/BundleClinicalInfo.json";
import { evaluateEcrSummaryRelevantLabResults } from "@/app/services/ecrSummaryService";
import BundleLab from "@/app/tests/assets/BundleLab.json";
import BundleLabNoLabIds from "@/app/tests/assets/BundleLabNoLabIds.json";
import BundleEcrSummary from "@/app/tests/assets/BundleEcrSummary.json";
import { Bundle } from "fhir/r4";
import { render, screen } from "@testing-library/react";
import React from "react";

const mappings = loadYamlConfig();
describe("ecrSummaryService Tests", () => {
  describe("Evaluate eCR Summary Relevant Clinical Details", () => {
    it("should return 'No Data' string when no SNOMED code is provided", () => {
      const expectedValue = "No matching clinical data found in this eCR";
      const actual = evaluateEcrSummaryRelevantClinicalDetails(
        BundleWithClinicalInfo as unknown as Bundle,
        mappings,
        "",
      );

      expect(actual).toHaveLength(1);
      expect(actual[0].value).toEqual(expectedValue);
    });

    it("should return 'No Data' string when the provided SNOMED code has no matches", () => {
      const expectedValue = "No matching clinical data found in this eCR";
      const actual = evaluateEcrSummaryRelevantClinicalDetails(
        BundleWithClinicalInfo as unknown as Bundle,
        mappings,
        "invalid-snomed-code",
      );

      expect(actual).toHaveLength(1);
      expect(actual[0].value).toEqual(expectedValue);
    });

    it("should return the correct active problem when the provided SNOMED code matches", () => {
      const result = evaluateEcrSummaryRelevantClinicalDetails(
        BundleWithClinicalInfo as unknown as Bundle,
        mappings,
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
    it("should return 'No Data' string when no SNOMED code is provided", () => {
      const expectedValue = "No matching lab results found in this eCR";
      const actual = evaluateEcrSummaryRelevantLabResults(
        BundleLab as unknown as Bundle,
        mappings,
        "",
      );

      expect(actual).toHaveLength(1);
      expect(actual[0].value).toEqual(expectedValue);
    });

    it("should return 'No Data' string when the provided SNOMED code has no matches", () => {
      const expectedValue = "No matching lab results found in this eCR";
      const actual = evaluateEcrSummaryRelevantLabResults(
        BundleLab as unknown as Bundle,
        mappings,
        "invalid-snomed-code",
      );

      expect(actual).toHaveLength(1);
      expect(actual[0].value).toEqual(expectedValue);
    });

    it("should return the correct lab result(s) when the provided SNOMED code matches", () => {
      const result = evaluateEcrSummaryRelevantLabResults(
        BundleLab as unknown as Bundle,
        mappings,
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

    it("should return all lab results when lab results are not LabReportElementData", () => {
      const result = evaluateEcrSummaryRelevantLabResults(
        BundleLabNoLabIds as unknown as Bundle,
        mappings,
        "840539006",
      );
      expect(result).toHaveLength(2); // 1 result, plus last item is divider line

      render(result[0].value);
      expect(screen.getByRole("button")).toBeInTheDocument();
      expect(screen.getByText("SARS-CoV-2, NAA CL")).toBeInTheDocument();
      expect(
        screen.getByText("Symptomatic as defined by CDC?"),
      ).toBeInTheDocument();
      expect(screen.getAllByText("2000-02-04T21:02:00.000Z")).toHaveLength(2);
    });

    it("should not include the last empty divider line when lastDividerLine is false", () => {
      const result = evaluateEcrSummaryRelevantLabResults(
        BundleLab as unknown as Bundle,
        mappings,
        "test-snomed",
        false,
      );

      expect(result).toHaveLength(2);
    });
  });

  describe("Evaluate eCR Summary Condition Summary", () => {
    it("should return titles based on snomed code, and return human-readable name if available", () => {
      const actual = evaluateEcrSummaryConditionSummary(
        BundleEcrSummary as unknown as Bundle,
        mappings,
      );

      expect(actual[0].title).toEqual("Hepatitis C");
      expect(actual[1].title).toEqual(
        "Disease caused by severe acute respiratory syndrome coronavirus 2 (disorder)",
      );
    });
    it("should return summaries based on snomed code", () => {
      const actual = evaluateEcrSummaryConditionSummary(
        BundleEcrSummary as unknown as Bundle,
        mappings,
      );
      render(
        actual[1].conditionDetails.map((detail) => (
          <React.Fragment key={detail.title}>{detail.value}</React.Fragment>
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
        BundleEcrSummary as unknown as Bundle,
        mappings,
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
        BundleEcrSummary as unknown as Bundle,
        mappings,
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
        BundleEcrSummary as unknown as Bundle,
        mappings,
      );
      render(
        actual[1].immunizationDetails.map((detail) => (
          <React.Fragment key={Math.random()}>{detail.value}</React.Fragment>
        )),
      );

      expect(screen.getByText("SARS-CoV-2 PCR Vaccine")).toBeInTheDocument();
    });
    it("should not display non-related immunization details", () => {
      const actual = evaluateEcrSummaryConditionSummary(
        {
          ...BundleEcrSummary,
          entry: [
            ...BundleEcrSummary.entry,
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
        } as unknown as Bundle,
        mappings,
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
      const actual = evaluateEcrSummaryConditionSummary({} as Bundle, mappings);

      expect(actual).toBeEmpty();
    });
    it("should return the the requested snomed first", () => {
      const verifyNotFirst = evaluateEcrSummaryConditionSummary(
        BundleEcrSummary as unknown as Bundle,
        mappings,
      );

      expect(verifyNotFirst[0].title).not.toEqual(
        "Disease caused by severe acute respiratory syndrome coronavirus 2 (disorder)",
      );

      const actual = evaluateEcrSummaryConditionSummary(
        BundleEcrSummary as unknown as Bundle,
        mappings,
        "840539006",
      );
      expect(actual[0].title).toEqual(
        "Disease caused by severe acute respiratory syndrome coronavirus 2 (disorder)",
      );
    });
  });
});
