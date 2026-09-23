import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Bundle, DiagnosticReport, Observation, Organization } from "fhir/r4";

import _BundleLab from "../../../../../../../test-data/fhir/BundleLab.json";
import _BundleLabInvalidResultsDiv from "../../../../../../../test-data/fhir/BundleLabInvalidResultsDiv.json";
import _BundleLabNoLabIds from "../../../../../../../test-data/fhir/BundleLabNoLabIds.json";
import _BundleLabObservationsOnly from "../../../../../../../test-data/fhir/BundleLabObservationsOnly.json";
import { AccordionItem } from "@/app/types";
import { HtmlTableJson } from "@/app/services/htmlTableService";
import { noData } from "@/app/utils/data-utils";
import { evaluateAllAndCheck, evaluateOneAndCheck } from "@/app/utils/evaluate";
import {
  checkAbnormalTag,
  searchResultRecord,
  returnFieldValueFromLabHtmlString,
  evaluateOrganismsReportData,
  evaluateDiagnosticReportData,
  evaluateLabOrganizationData,
  ResultObject,
  combineOrgAndReportData,
  evaluateLabInfoData,
  findIdenticalOrg,
  returnAnalysisTime,
  LabReportElementData,
  getJsonLab,
  getAllLabJsonObjects,
  getObservations,
  getLabResultGroups,
  matchesResultId,
  LabInterpretationTag,
} from "@/app/view-data/services/labsService";
import {
  FhirIndex,
  getFhirIndex,
  getResourcesByType,
} from "@/app/view-data/services/fhirResourcesIndexService";

const BundleLab = _BundleLab as unknown as Bundle;
const fhirIndexBundleLab = getFhirIndex(BundleLab);

const BundleLabInvalidResultsDiv =
  _BundleLabInvalidResultsDiv as unknown as Bundle;
const fhirIndexBundleLabInvalidResultsDiv = getFhirIndex(
  BundleLabInvalidResultsDiv,
);

const BundleLabNoLabIds = _BundleLabNoLabIds as unknown as Bundle;
const fhirIndexBundleLabNoLabIds = getFhirIndex(BundleLabNoLabIds);

const BundleLabObservationsOnly =
  _BundleLabObservationsOnly as unknown as Bundle;
const fhirIndexBundleLabObservationsOnly = getFhirIndex(
  BundleLabObservationsOnly,
);

const pathLabReportNormal =
  "Bundle.entry.resource.where(resourceType = 'DiagnosticReport').where(id = 'c090d379-9aea-f26e-4ddc-378223841e3b')";
const labReportNormal = evaluateOneAndCheck<DiagnosticReport>(
  BundleLab,
  pathLabReportNormal,
  "DiagnosticReport",
);
const labReportNormalJsonObject = {
  resultId: "Result.1.2.3.4.5",
  resultName: "Stool Pathogens, NAAT, 12 to 25 Targets",
  tables: [
    [
      {
        Component: {
          value: "Campylobacter, NAAT",
          metadata: {
            "data-id": "Result.1.2.3.4.5.Comp1Name",
          },
        },
        Value: { value: "Not Detected", metadata: {} },
        "Ref Range": { value: "Not Detected", metadata: {} },
        "Test Method": {
          value: <p>LAB DEVICE: BIOFIRE® FILMARRAY® 2.0 SYSTEM</p>,
          metadata: {},
        },
        "Analysis Time": {
          value: (
            <p>
              <span>
                <i>09/28/2000 1:59:00 PM PDT</i>
              </span>
            </p>
          ),
          metadata: {},
        },
        "Performed At": {
          value: "Gungan City Hospital",
          metadata: {},
        },
        "Pathologist Signature": {
          value: "",
          metadata: {
            "data-id": "Result.1.2.3.4.5.Comp1Signature",
          },
        },
      },
      {
        Component: {
          value: "Plesiomonas shigelloides, NAAT",
          metadata: {
            "data-id": "Result.1.2.3.4.5.Comp2Name",
          },
        },
        Value: { value: "Not Detected", metadata: {} },
        "Ref Range": { value: "Not Detected", metadata: {} },
        "Test Method": {
          value: <p>LAB DEVICE: BIOFIRE® FILMARRAY® 2.0 SYSTEM</p>,
          metadata: {},
        },
        "Analysis Time": {
          value: (
            <p>
              <span>09/28/2000 1:59:00 PM PDT</span>
            </p>
          ),
          metadata: {},
        },
        "Performed At": {
          value: "Gungan City Hospital",
          metadata: {},
        },
        "Pathologist Signature": {
          value: "",
          metadata: {
            "data-id": "Result.1.2.3.4.5.Comp2Signature",
          },
        },
      },
    ],
    [
      {
        "Specimen (Source)": {
          value: "Stool",
          metadata: {
            "data-id": "Result.1.2.3.4.5.Specimen",
          },
        },
        "Anatomical Location / Laterality": {
          value: "STOOL SPECIMEN / Unknown",
          metadata: {},
        },
        "Collection Method / Volume": { value: "", metadata: {} },
        "Collection Time": {
          value: "09/28/2000 4:51\u00A0PM\u00A0EDT",
          metadata: {},
        },
        "Received Time": {
          value: "09/28/2000 4:51\u00A0PM\u00A0EDT",
          metadata: {},
        },
      },
    ],
    [
      {
        "Authorizing Provider": { value: "Darth Test MD", metadata: {} },
        "Result Type": {
          value: "MICROBIOLOGY - GENERAL ORDERABLES",
          metadata: {},
        },
      },
    ],
    [
      {
        "Performing Organization": {
          value: <p>Gungan City Hospital</p>,
          metadata: {
            "data-id": "Result.1.2.3.4.5.PerformingLab",
          },
        },
        Address: { value: <p>500000 S. Jar Jar Binks Street</p>, metadata: {} },
        "City/State/ZIP Code": {
          value: <p>Gungan City, CA 00123</p>,
          metadata: {},
        },
        "Phone Number": { value: <p>555-555-5555</p>, metadata: {} },
      },
    ],
  ],
};

const pathLabReportAbnormal =
  "Bundle.entry.resource.where(resourceType = 'DiagnosticReport').where(id = '68477c03-5689-f9e5-c267-a3c7bdff6fe0')";
const labReportAbnormal = evaluateOneAndCheck<DiagnosticReport>(
  BundleLab,
  pathLabReportAbnormal,
  "DiagnosticReport",
);
const jsonLabs = getAllLabJsonObjects(fhirIndexBundleLab);
const labReportAbnormalJsonObject = getJsonLab(
  jsonLabs,
  getObservations(labReportAbnormal!, fhirIndexBundleLab),
  labReportAbnormal!,
);

const pathLabOrganismsTableAndNarr =
  "Bundle.entry.resource.where(resourceType = 'DiagnosticReport').where(id = 'b0f590a6-4bf5-7add-9716-2bd3ba6defb2')";
const labOrganismsTableAndNarr = evaluateOneAndCheck<DiagnosticReport>(
  BundleLab,
  pathLabOrganismsTableAndNarr,
  "DiagnosticReport",
);

describe("LabsService tests", () => {
  describe("Labs Utils", () => {
    describe("getObservations", () => {
      it("extracts an array of observation resources", () => {
        const result = getObservations(
          {
            result: [
              {
                reference: "Observation/1c0f3367-0588-c90e-fed0-0d8c15c5ac1b",
              },
            ],
            resourceType: "DiagnosticReport",
            code: {},
            status: "entered-in-error",
          },
          fhirIndexBundleLab,
        );

        const expectedObservationPath =
          "Bundle.entry.resource.where(resourceType = 'Observation').where(id = '1c0f3367-0588-c90e-fed0-0d8c15c5ac1b')";
        const expectedResult = evaluateAllAndCheck<Observation>(
          BundleLab,
          expectedObservationPath,
          "Observation",
        );
        expect(result.toString()).toBe(expectedResult.toString());
      });

      it("returns an empty array of observation resources if none are found", () => {
        const result = getObservations(
          {
            result: [
              {
                reference: "Observation/invalid-observation-id",
              },
            ],
            resourceType: "DiagnosticReport",
            code: {},
            status: "final",
          },
          fhirIndexBundleLab,
        );
        expect(result).toStrictEqual([]);
      });
    });

    describe("getLabJsonObject", () => {
      it("returns correct Json Object for table with data-id", () => {
        const expectedResult = labReportNormalJsonObject;

        const jsonLabs = getAllLabJsonObjects(fhirIndexBundleLab);
        const result = getJsonLab(
          jsonLabs,
          getObservations(labReportNormal!, fhirIndexBundleLab),
          labReportNormal!,
        );

        expect(result).toEqual(expectedResult);
      });

      it("falls back to a report's second identifier when the first doesn't match the narrative item", () => {
        const jsonLabs: HtmlTableJson[] = [
          {
            resultId: "Result.1.2.840.114350.2.478.2.798268.2.612310420.1",
            resultName: "X-ray report",
            tables: [],
          },
        ];
        const report: DiagnosticReport = {
          resourceType: "DiagnosticReport",
          code: {},
          status: "final",
          identifier: [
            // Short local order number - not a suffix of the narrative ID above.
            {
              system: "urn:oid:1.2.840.114350.1.13.478.2.7.2.798268",
              value: "612310420",
            },
            // Fuller value that does match the narrative ID's trailing segment.
            {
              system: "urn:oid:1.2.840.10008.6.1.535.110180",
              value: "612310420.1",
            },
          ],
        };

        const result = getJsonLab(jsonLabs, [], report);

        expect(result?.resultName).toBe("X-ray report");
      });

      it("matches an Observation-backed result to its narrative by identifier", () => {
        const result = getJsonLab(
          [
            {
              resultId: "Result.1.2.840.114350.4832279",
              resultName: "Observation-backed result",
              tables: [],
            },
          ],
          [],
          {
            resourceType: "Observation",
            status: "final",
            code: {},
            identifier: [{ value: "4832279" }],
          },
        );

        expect(result?.resultName).toBe("Observation-backed result");
      });

      it("returns undefined for table without data-id", () => {
        const labReportWithoutIds = evaluateOneAndCheck<DiagnosticReport>(
          BundleLabNoLabIds,
          "Bundle.entry.resource.where(resourceType = 'DiagnosticReport').where(id = '97d3b36a-f833-2f3c-b456-abeb1fd342e4')",
          "DiagnosticReport",
        );

        const jsonLabs = getAllLabJsonObjects(fhirIndexBundleLabNoLabIds);
        const result = getJsonLab(
          jsonLabs,
          getObservations(labReportWithoutIds!, fhirIndexBundleLabNoLabIds),
          labReportWithoutIds!,
        );

        expect(result).toBeUndefined();
      });

      it("returns undefined if lab results html contains no tables", () => {
        const jsonLabs = getAllLabJsonObjects(fhirIndexBundleLab);
        const result = getJsonLab(
          jsonLabs,
          getObservations(
            labReportNormal!,
            fhirIndexBundleLabInvalidResultsDiv,
          ),
          { resourceType: "DiagnosticReport", code: {}, status: "final" },
        );

        expect(result).toBeUndefined();
      });

      it("does not cross-match a different report whose ID merely contains the resultId as a substring", () => {
        const jsonLabs: HtmlTableJson[] = [
          // Unrelated report; its ID happens to contain "111.42" as a
          // substring, but isn't actually delimited the same way.
          {
            resultId: "Result.9111.429",
            resultName: "Wrong report",
            tables: [],
          },
          {
            resultId: "Result.111.42",
            resultName: "Correct report",
            tables: [],
          },
        ];
        const observations: Observation[] = [
          {
            resourceType: "Observation",
            status: "final",
            code: {},
            extension: [
              {
                url: "observation entry reference value",
                valueString: "#Result.111.42Comp1",
              },
            ],
          },
        ];

        const result = getJsonLab(jsonLabs, observations, {
          resourceType: "DiagnosticReport",
          code: {},
          status: "final",
        });

        expect(result?.resultName).toBe("Correct report");
      });
    });

    describe("matchesResultId", () => {
      it("matches when resultId is the entire item ID", () => {
        expect(matchesResultId("111.42", "111.42")).toBe(true);
      });

      it("matches when resultId is a dot-delimited segment within the item ID", () => {
        expect(matchesResultId("Result.1.2.840.114350.111.42", "111.42")).toBe(
          true,
        );
      });

      it("does not match when resultId is only a bare substring, not a delimited segment", () => {
        expect(matchesResultId("Result.9111.429", "111.42")).toBe(false);
      });

      it("matches any candidate in a comma-separated resultId list", () => {
        expect(matchesResultId("Result.111.42", "999.99, 111.42")).toBe(true);
      });

      it("does not match a short resultId that only coincides with a middle segment of an unrelated item ID", () => {
        // "22" is dot-delimited on both sides here, but it's the middle of an
        // unrelated ID, not the item's actual trailing identifying number.
        expect(matchesResultId("Result.99.22.5", "22")).toBe(false);
        expect(matchesResultId("Result.22", "22")).toBe(true);
      });
    });

    describe("checkAbnormalTag", () => {
      it("should return true if lab report has abnormal tag", () => {
        const expectedResult = true;
        const result = checkAbnormalTag(labReportAbnormalJsonObject);

        expect(result).toStrictEqual(expectedResult);
      });

      it("should return false if lab report does not have abnormal tag", () => {
        const expectedResult = false;
        const result = checkAbnormalTag(labReportNormalJsonObject);

        expect(result).toStrictEqual(expectedResult);
      });
    });

    describe("LabInterpretationTag", () => {
      it("should return null if no observations", () => {
        const { container } = render(
          <LabInterpretationTag observations={[]} />,
        );
        expect(container).toBeEmptyDOMElement();
      });

      it("should return null if observation interpretation is undefined", () => {
        const { container } = render(
          <LabInterpretationTag
            observations={[
              {
                interpretation: undefined,
                resourceType: "Observation",
                code: { coding: undefined },
                status: "unknown",
              },
            ]}
          />,
        );
        expect(container).toBeEmptyDOMElement();
      });

      it("should return null if observation interpretation is empty", () => {
        const { container } = render(
          <LabInterpretationTag
            observations={[
              {
                interpretation: [],
                resourceType: "Observation",
                code: { coding: undefined },
                status: "unknown",
              },
            ]}
          />,
        );
        expect(container).toBeEmptyDOMElement();
      });

      it("should return null if observation interpretation coding is not HL7 observation interpretation code", () => {
        const { container } = render(
          <LabInterpretationTag
            observations={[
              {
                interpretation: [{ coding: [{ system: "http://test.com" }] }],
                resourceType: "Observation",
                code: { coding: undefined },
                status: "unknown",
              },
            ]}
          />,
        );
        expect(container).toBeEmptyDOMElement();
      });

      it("should return null if observation interpretation coding code is not abnormal", () => {
        const { container } = render(
          <LabInterpretationTag
            observations={[
              {
                interpretation: [
                  {
                    coding: [
                      {
                        system:
                          "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
                        code: "ZZ",
                      },
                    ],
                  },
                ],
                resourceType: "Observation",
                code: { coding: undefined },
                status: "unknown",
              },
            ]}
          />,
        );
        expect(container).toBeEmptyDOMElement();
      });

      it("should return AbnormalObservationInterpretation if code is abnormal", () => {
        render(
          <LabInterpretationTag
            observations={[
              {
                interpretation: [
                  {
                    coding: [
                      {
                        system:
                          "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
                        code: "AA",
                      },
                    ],
                  },
                ],
                resourceType: "Observation",
                code: { coding: undefined },
                status: "unknown",
              },
            ]}
          />,
        );
        expect(screen.getByText("Critical Abnormal")).toBeVisible();
      });

      it("should return all AbnormalObservationInterpretation if code is abnormal", () => {
        render(
          <LabInterpretationTag
            observations={[
              {
                interpretation: [
                  {
                    coding: [
                      {
                        system:
                          "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
                        code: "AA",
                      },
                    ],
                  },
                  {
                    coding: [
                      {
                        system:
                          "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
                        code: "LL",
                      },
                    ],
                  },
                ],
                resourceType: "Observation",
                code: { coding: undefined },
                status: "unknown",
              },
            ]}
          />,
        );
        expect(screen.getByText("Critical Abnormal")).toBeVisible();
        expect(screen.getByText("Critical Low")).toBeVisible();
      });

      it("should favor diagnostic report interpretation if available", () => {
        render(
          <LabInterpretationTag
            observations={[
              {
                interpretation: [
                  {
                    coding: [
                      {
                        system:
                          "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
                        code: "AA",
                      },
                    ],
                  },
                  {
                    coding: [
                      {
                        system:
                          "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
                        code: "LL",
                      },
                    ],
                  },
                ],
                resourceType: "Observation",
                code: { coding: undefined },
                status: "unknown",
              },
              {
                interpretation: [],
                resourceType: "Observation",
                code: {
                  coding: [{ code: "56850-1", system: "http://loinc.org" }],
                },
                valueString: "Super weird",
                status: "unknown",
              },
            ]}
          />,
        );
        expect(screen.getByText("Super weird")).toBeVisible();
        expect(screen.queryByText("Critical Abnormal")).toBeNull();
        expect(screen.queryByText("Critical Low")).toBeNull();
      });

      it("should fallback to checkAbnormalTag logic when lab report is abnormal, but not one of the abnormal observation interpretations", () => {
        render(
          <LabInterpretationTag
            observations={getObservations(
              labReportAbnormal!,
              fhirIndexBundleLab,
            )}
            labReportJson={labReportAbnormalJsonObject}
          />,
        );
        const tagElement = screen.getByText("Abnormal");
        expect(tagElement).toBeInTheDocument();
        expect(tagElement).toHaveStyle({ backgroundColor: "#B50909" });
        expect(tagElement).toHaveClass("margin-left-105");
      });
    });
  });

  describe("searchResultRecord", () => {
    const labHTMLJson = labReportNormalJsonObject.tables;

    it("extracts string of all results of a search for specified lab report", () => {
      const searchKey = "Collection Time";
      const expectedResult = "09/28/2000 4:51\u00A0PM\u00A0EDT";

      const result = searchResultRecord(labHTMLJson, searchKey);

      expect(result).toStrictEqual(expectedResult);
    });

    it("returns an empty string of results if none are found for search key", () => {
      const invalidSearchKey = "foobar";
      const expectedResult = "";

      const result = searchResultRecord(labHTMLJson, invalidSearchKey);

      expect(result).toEqual(expectedResult);
    });
  });

  describe("returnAnalysisTime", () => {
    it("extracts and formats correct field value from within a lab report", () => {
      const fieldName = "Analysis Time";

      const result = returnAnalysisTime(labReportNormalJsonObject, fieldName);

      expect(result).toEqual("09/28/2000 4:59\u00A0PM\u00A0EDT");
    });

    it("extracts returns noData if unavailable", () => {
      const fieldName = "Analysis Time";

      const result = returnAnalysisTime({}, fieldName);

      expect(result).toEqual(noData);
    });

    it("Concats date times if multiple passed", () => {
      const fieldName = "Analysis Time";

      const result = returnAnalysisTime(
        {
          resultId: "Result.1.2.3.4.5",
          resultName: "Stool Pathogens, NAAT, 12 to 25 Targets",
          tables: [
            [
              {
                "Analysis Time": {
                  value: (
                    <p>
                      <span>
                        <i>09/28/2000 1:59:00 PM PDT</i>
                      </span>
                      <span>
                        <i>09/28/2000 2:59:00 PM PDT</i>
                      </span>
                    </p>
                  ),
                  metadata: {},
                },
              },
            ],
          ],
        },
        fieldName,
      );

      expect(result).toEqual(
        "09/28/2000 4:59\u00A0PM\u00A0EDT, 09/28/2000 5:59\u00A0PM\u00A0EDT",
      );
    });

    it("Returns concated date times if deeply nested", () => {
      const fieldName = "Analysis Time";

      const result = returnAnalysisTime(
        {
          resultId: "Result.1.2.3.4.5",
          resultName: "Stool Pathogens, NAAT, 12 to 25 Targets",
          tables: [
            [
              {
                "Analysis Time": {
                  value: (
                    <p>
                      <span>
                        <i>09/28/2000 1:59:00 PM PDT</i>
                        <i>09/28/2000 2:59:00 PM PDT</i>
                      </span>
                    </p>
                  ),
                  metadata: {},
                },
              },
            ],
          ],
        },
        fieldName,
      );

      expect(result).toEqual(
        "09/28/2000 4:59\u00A0PM\u00A0EDT, 09/28/2000 5:59\u00A0PM\u00A0EDT",
      );
    });

    it("Returns noData if emptiness is nested", () => {
      const fieldName = "Analysis Time";

      const result = returnAnalysisTime(
        {
          resultId: "Result.1.2.3.4.5",
          resultName: "Stool Pathogens, NAAT, 12 to 25 Targets",
          tables: [
            [
              {
                "Analysis Time": {
                  value: (
                    <p>
                      <span>
                        <i></i>
                      </span>
                    </p>
                  ),
                  metadata: {},
                },
              },
            ],
          ],
        },
        fieldName,
      );

      expect(result).toEqual(noData);
    });
  });

  describe("returnFieldValueFromLabHtmlString", () => {
    it("extracts correct field value from within a lab report", () => {
      const fieldName = "Analysis Time";

      const result = returnFieldValueFromLabHtmlString(
        labReportNormalJsonObject,
        fieldName,
      );

      expect(result).toMatchSnapshot();
    });

    it("returns NoData if none are found for field name", () => {
      const invalidFieldName = "foobar";

      const result = returnFieldValueFromLabHtmlString(
        labReportNormalJsonObject,
        invalidFieldName,
      );

      expect(result).toStrictEqual(noData);
    });
  });

  describe("evaluateOrganismsReportData", () => {
    it("should return the correct organisms table when the data exists for a lab report", () => {
      const result = evaluateOrganismsReportData(
        getObservations(labOrganismsTableAndNarr!, fhirIndexBundleLab),
      )!;
      render(result);

      expect(
        screen.getByText("Avycaz (Ceftazidime/Avibactam)"),
      ).toBeInTheDocument();
      expect(screen.getByText("0.25: Susceptible")).toBeInTheDocument();
      expect(screen.getAllByText("MIC")).toHaveLength(3);
    });
    it("should return undefined if lab organisms data does not exist for a lab report", () => {
      const result = evaluateOrganismsReportData(
        getObservations(labReportNormal!, fhirIndexBundleLab),
      );

      expect(result).toBeUndefined();
    });
  });

  describe("Evaluate Diagnostic Report", () => {
    it("should evaluate diagnostic report results", () => {
      const report = getResourcesByType<DiagnosticReport>(
        fhirIndexBundleLab,
        "DiagnosticReport",
      )[0];
      const actual = evaluateDiagnosticReportData(
        getObservations(report, fhirIndexBundleLab),
        fhirIndexBundleLab,
      );

      render(actual);

      expect(screen.getByText("Campylobacter, NAAT")).toBeInTheDocument();
      expect(screen.getAllByText("Not Detected")).not.toBeEmpty();
    });
    it("the table should not appear when there are no results", () => {
      const diagnosticReport: DiagnosticReport = {
        resourceType: "DiagnosticReport",
        code: {
          coding: [
            {
              display: "Drugs Of Abuse Comprehensive Screen, Ur",
            },
          ],
        },
        status: "final",
      };
      const actual = evaluateDiagnosticReportData(
        getObservations(diagnosticReport, null as unknown as FhirIndex),
        null as unknown as FhirIndex,
      );
      expect(actual).toBeUndefined();
    });
    it("should evaluate test method results", () => {
      const report = getResourcesByType<DiagnosticReport>(
        fhirIndexBundleLab,
        "DiagnosticReport",
      )[0];
      const actual = evaluateDiagnosticReportData(
        getObservations(report, fhirIndexBundleLab),
        fhirIndexBundleLab,
      );

      render(actual);

      expect(
        screen.getAllByText("LAB DEVICE: BIOFIRE® FILMARRAY® 2.0 SYSTEM"),
      ).not.toBeEmpty();
    });
    it("should display comment", async () => {
      const report = getResourcesByType<DiagnosticReport>(
        fhirIndexBundleLab,
        "DiagnosticReport",
      )[2];
      const actual = evaluateDiagnosticReportData(
        getObservations(report, fhirIndexBundleLab),
        fhirIndexBundleLab,
      );
      render(actual!);

      expect(screen.getByText("View comment")).toBeInTheDocument();

      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: "View comment" }));

      expect(screen.getByText("Hide comment")).toBeInTheDocument();

      expect(
        screen.getByText(/View more \([0-9,]+ characters total\)/),
      ).toBeInTheDocument();
      await user.click(
        screen.getByRole("button", {
          name: /View more \([0-9,]+ characters total\)/,
        }),
      );
      expect(
        screen.getByText(/View less \([0-9,]+ characters total\)/),
      ).toBeInTheDocument();
    });
  });

  describe("Evaluate Organization with ID", () => {
    it("should return a matching org", () => {
      const result = evaluateLabOrganizationData(
        "14394818-a1e9-4882-ca8b-FAKE793bb5cc",
        fhirIndexBundleLab,
        0,
      );
      expect(result[0].value).toEqual("Tatooine Hospital");
    });
    it("should combine the data into new format", () => {
      const testResultObject: ResultObject = {
        "Organization/22c6cdd0-bde1-e220-9ba4-2c2802f795ad": [
          {} as AccordionItem,
        ],
      };
      const result = combineOrgAndReportData(
        testResultObject,
        fhirIndexBundleLab,
      );
      expect(result[0].organizationDisplayDataProps).toBeArray();
    });

    it("should resolve an idless organization through its URN reference", () => {
      const bundle = {
        resourceType: "Bundle",
        type: "document",
        entry: [
          {
            fullUrl: "urn:uuid:idless-lab-organization",
            resource: {
              resourceType: "Organization",
              name: "Idless Reference Lab",
            },
          },
        ],
      } as unknown as Bundle;
      const fhirIndex = getFhirIndex(bundle);
      const result = combineOrgAndReportData(
        {
          "urn:uuid:idless-lab-organization": [{} as AccordionItem],
        },
        fhirIndex,
      );

      expect(result[0].organizationId).toBe("urn:uuid:idless-lab-organization");
      expect(result[0].organizationDisplayDataProps[0].value).toBe(
        "Idless Reference Lab",
      );
    });
  });

  describe("Evaluate the lab info section", () => {
    it("should return a list of LabReportElementData if the lab results in the HTML table have ID's", () => {
      const result = evaluateLabInfoData(
        fhirIndexBundleLab,
        getResourcesByType<DiagnosticReport>(
          fhirIndexBundleLab,
          "DiagnosticReport",
        ),
      );
      expect(result[0]).toHaveProperty("diagnosticReportDataItems");
      expect(result[0]).toHaveProperty("organizationDisplayDataProps");
    });

    it("should return a list of LabReportElementData even if the lab results in the HTML table do not have ID's", () => {
      const result = evaluateLabInfoData(
        fhirIndexBundleLabNoLabIds,
        getResourcesByType<DiagnosticReport>(
          fhirIndexBundleLabNoLabIds,
          "DiagnosticReport",
        ),
      );
      expect(result[0]).toHaveProperty("diagnosticReportDataItems");
      expect(result[0]).toHaveProperty("organizationDisplayDataProps");
    });

    it("should properly count the number of labs", () => {
      const result = evaluateLabInfoData(
        fhirIndexBundleLab,
        getResourcesByType<DiagnosticReport>(
          fhirIndexBundleLab,
          "DiagnosticReport",
        ),
      );
      const props = (result[0] as LabReportElementData)
        .organizationDisplayDataProps;
      expect(props[3].title).toEqual("Number of Results");
      expect(props[3].value).toEqual(2);
    });

    it("builds lab groups from Results-section Observations when no DiagnosticReports exist", () => {
      const groups = getLabResultGroups(fhirIndexBundleLabObservationsOnly);

      expect(groups).toHaveLength(2);
      expect(groups.map(({ source }) => source.resourceType)).toEqual([
        "Observation",
        "Observation",
      ]);
      expect(
        groups.map(({ observations }) =>
          observations.map(
            (observation) =>
              observation.code?.text ?? observation.code?.coding?.[0]?.display,
          ),
        ),
      ).toEqual([
        ["Panel component", "Lab Interpretation"],
        ["Direct laboratory result"],
      ]);
    });

    it("renders Observation-backed labs, specimens, values, and PractitionerRole organizations", () => {
      const result = evaluateLabInfoData(fhirIndexBundleLabObservationsOnly);

      expect(result).toHaveLength(1);
      expect(result[0].diagnosticReportDataItems).toHaveLength(2);
      expect(result[0].organizationDisplayDataProps).toEqual([
        {
          title: "Lab Performing Name",
          value: "Example Hospital Laboratory",
        },
        {
          title: "Lab Address",
          value: "100 Laboratory Way\nExample City, MD 20000",
        },
        { title: "Lab Contact", value: "202-555-0100" },
        { title: "Number of Results", value: 2 },
      ]);

      render(
        <>
          {result[0].diagnosticReportDataItems.map((item) => (
            <div key={item.id}>
              {item.title}
              {item.content}
            </div>
          ))}
        </>,
      );

      expect(screen.getByText("Panel laboratory study")).toBeInTheDocument();
      expect(screen.getAllByText("Direct laboratory result")).toHaveLength(2);
      expect(screen.getByText(/Positive/)).toBeInTheDocument();
      expect(screen.getByText(/DETECTED/)).toBeInTheDocument();
      expect(screen.getAllByText("Abnormal")).toHaveLength(2);
      expect(screen.getByText("Specimen (Source): Blood")).toBeInTheDocument();
      expect(screen.getByText("Specimen (Source): Swab")).toBeInTheDocument();
      expect(screen.getByText("Plain clinical comment")).toBeInTheDocument();
      expect(screen.queryByText("No test reported")).not.toBeInTheDocument();
      expect(
        screen.queryByText("Unrelated observation"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(/Serialized narrative row/),
      ).not.toBeInTheDocument();
    });

    it("keeps DiagnosticReports as the primary lab representation", () => {
      const report: DiagnosticReport = {
        resourceType: "DiagnosticReport",
        status: "final",
        code: { text: "Report-backed lab" },
      };

      const groups = getLabResultGroups(fhirIndexBundleLabObservationsOnly, [
        report,
      ]);

      expect(groups).toHaveLength(1);
      expect(groups[0].source).toBe(report);
    });

    it("renders no labs when the caller explicitly supplies an empty report list", () => {
      expect(
        evaluateLabInfoData(fhirIndexBundleLabObservationsOnly, []),
      ).toEqual([]);
    });

    it("deduplicates cyclic hasMember references", () => {
      const cyclicBundle = {
        resourceType: "Bundle",
        type: "document",
        entry: [
          {
            fullUrl: "urn:uuid:composition",
            resource: {
              resourceType: "Composition",
              section: [
                {
                  code: {
                    coding: [{ system: "http://loinc.org", code: "30954-2" }],
                  },
                  entry: [{ reference: "urn:uuid:cycle-panel" }],
                },
              ],
            },
          },
          {
            fullUrl: "urn:uuid:cycle-panel",
            resource: {
              resourceType: "Observation",
              status: "final",
              category: [
                {
                  coding: [
                    {
                      system:
                        "http://terminology.hl7.org/CodeSystem/observation-category",
                      code: "laboratory",
                    },
                  ],
                },
              ],
              code: { text: "Cycle panel" },
              hasMember: [{ reference: "urn:uuid:cycle-result" }],
            },
          },
          {
            fullUrl: "urn:uuid:cycle-result",
            resource: {
              resourceType: "Observation",
              status: "final",
              code: { text: "Cycle result" },
              valueString: "Detected",
              hasMember: [{ reference: "urn:uuid:cycle-panel" }],
            },
          },
        ],
      } as unknown as Bundle;

      const groups = getLabResultGroups(getFhirIndex(cyclicBundle));

      expect(groups).toHaveLength(1);
      expect(groups[0].observations).toHaveLength(1);
      expect(groups[0].observations[0].code?.text).toBe("Cycle result");
    });
  });

  describe("Find Identical Org", () => {
    const orgMappings: Organization[] = [
      {
        id: "d6930155-009b-92a0-d2b9-007761c45ad2",
        name: "Coruscant Department of Public Health",
        active: true,
        address: [
          {
            use: "work",
            city: "Sacramento",
            state: "CA",
          },
        ],
        telecom: [
          {
            use: "work",
            value: "fakeemail@example.com",
            system: "email",
          },
        ],
        resourceType: "Organization",
      },
      {
        id: "f87de327-7272-42ac-012d-58904caf7ef1",
        name: "Coruscant City Department of Public Health",
        active: true,
        resourceType: "Organization",
      },
      {
        id: "21e7aca1-7a03-43dc-15e6-8f7ee24b6613",
        name: "Mos Eisley Department of Health",
        active: true,
        resourceType: "Organization",
      },
      {
        id: "d319a926-0eb3-5847-3b21-db8b778b4f07",
        name: "Naboo University Medical Center",
        address: [
          {
            use: "work",
            city: "Naboo City",
            line: ["0000 Up Ave"],
            state: "TN",
            country: "USA",
            district: "Central",
            postalCode: "00123",
          },
        ],
        telecom: [
          {
            use: "work",
            value: "+1-555-555-5555",
            system: "phone",
          },
        ],
        resourceType: "Organization",
      },
      {
        id: "22c6cdd0-bde1-e220-9ba4-2c2802f795ad",
        name: "Mos Espa Lab",
        address: [
          {
            use: "work",
            city: "Naboo City",
            line: ["0000 Up Ave"],
            state: "TN",
            country: "USA",
            district: "Central",
            postalCode: "00123",
          },
        ],
        resourceType: "Organization",
        telecom: [
          {
            value: "+1-555-555-5555",
            system: "phone",
          },
        ],
      },
      {
        id: "e3ece69c-0968-59c9-47dd-f16db731621a",
        name: "Mos Espa Lab",
        address: [
          {
            use: "work",
            city: "Naboo City",
            line: ["0000 Up Ave"],
            state: "TN",
            country: "USA",
            district: "Central",
            postalCode: "00123",
          },
        ],
        telecom: [
          {
            value: "+1-615-875-5227",
            system: "phone",
          },
        ],
        resourceType: "Organization",
      },
      {
        id: "57fcc148-b440-3a80-749b-780325e9680d",
        name: "Moderna US, Inc.",
        resourceType: "Organization",
      },
    ];

    const matchedOrg1: Organization = {
      id: "22c6cdd0-bde1-e220-9ba4-2c2802f795ad",
      name: "Mos Espa Lab",
      address: [
        {
          use: "work",
          city: "Naboo City",
          line: ["0000 Up Ave"],
          state: "TN",
          country: "USA",
          district: "Central",
          postalCode: "00123",
        },
      ],
      resourceType: "Organization",
    };

    const matchedOrg2: Organization = {
      id: "7",
      name: "Fake Lab",
      address: [
        {
          city: "North Charleston",
          line: ["11 Fake Street", "Suite 100"],
          state: "SC",
          country: "USA",
          postalCode: "29405",
        },
      ],
      resourceType: "Organization",
    };

    it("should add telecom from matching org", () => {
      expect(matchedOrg1?.telecom).not.toBeDefined();
      expect(
        findIdenticalOrg(orgMappings, matchedOrg1)?.telecom?.[0].value,
      ).toEqual("+1-615-875-5227");
    });
    it("should not add telecom because no matching org", () => {
      expect(matchedOrg2?.telecom).not.toBeDefined();
      expect(
        findIdenticalOrg(orgMappings, matchedOrg2)?.telecom?.[0].value,
      ).not.toBeDefined();
    });
  });

  describe("Using FhirIndex in labsService", () => {
    // Might be able to remove these tests down the line
    const fhirIndexEmpty: FhirIndex = {
      fhirIndexByType: {},
      fhirIndexByTypeAndId: {},
    };
    it("getAllLabJsonObjects should return [] when FhirIndex is empty", () => {
      const actual = getAllLabJsonObjects(fhirIndexEmpty);
      expect(actual).toEqual([]);
    });
    it("evaluateDiagnosticReportData should return undefined when FhirIndex is empty and no observation resources", () => {
      const actual = evaluateDiagnosticReportData([], fhirIndexEmpty);
      expect(actual).toEqual(undefined);
    });
    it("combineOrgAndReportData should return [] when FhirIndex is empty and no organizationItems", () => {
      const actual = combineOrgAndReportData({}, fhirIndexEmpty);
      expect(actual).toEqual([]);
    });
  });
});
