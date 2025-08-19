import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Bundle, DiagnosticReport, Observation, Organization } from "fhir/r4";

import _BundleLab from "../../../../../../../test-data/fhir/BundleLab.json";
import _BundleLabInvalidResultsDiv from "../../../../../../../test-data/fhir/BundleLabInvalidResultsDiv.json";
import _BundleLabNoLabIds from "../../../../../../../test-data/fhir/BundleLabNoLabIds.json";
import { AccordionItem } from "@/app/types";
import { noData } from "@/app/utils/data-utils";
import {
  evaluateAll,
  evaluateAllAndCheck,
  evaluateOneAndCheck,
} from "@/app/utils/evaluate";
import fhirPathMappings from "@/app/utils/evaluate/fhir-paths";
import {
  checkAbnormalTag,
  searchResultRecord,
  returnFieldValueFromLabHtmlString,
  evaluateOrganismsReportData,
  evaluateDiagnosticReportData,
  evaluateLabOrganizationData,
  evaluateAbnormalObservationInterpretation,
  ResultObject,
  combineOrgAndReportData,
  evaluateLabInfoData,
  findIdenticalOrg,
  returnAnalysisTime,
  LabReportElementData,
  getJsonLab,
  getAllLabJsonObjects,
  getObservations,
  isAbnormalObservationInterpretation,
  renderLabAbnormalityTag,
} from "@/app/view-data/services/labsService";

const BundleLab = _BundleLab as unknown as Bundle;
const BundleLabInvalidResultsDiv =
  _BundleLabInvalidResultsDiv as unknown as Bundle;
const BundleLabNoLabIds = _BundleLabNoLabIds as unknown as Bundle;

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
const jsonLabs = getAllLabJsonObjects(BundleLab);
const labReportAbnormalJsonObject = getJsonLab(
  jsonLabs,
  getObservations(labReportAbnormal!, BundleLab),
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
          BundleLab,
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
          BundleLab,
        );
        expect(result).toStrictEqual([]);
      });
    });

    describe("getLabJsonObject", () => {
      it("returns correct Json Object for table with data-id", () => {
        const expectedResult = labReportNormalJsonObject;

        const jsonLabs = getAllLabJsonObjects(BundleLab);
        const result = getJsonLab(
          jsonLabs,
          getObservations(labReportNormal!, BundleLab),
        );

        expect(result).toEqual(expectedResult);
      });

      it("returns undefined for table without data-id", () => {
        const labReportWithoutIds = evaluateOneAndCheck<DiagnosticReport>(
          BundleLabNoLabIds,
          "Bundle.entry.resource.where(resourceType = 'DiagnosticReport').where(id = '97d3b36a-f833-2f3c-b456-abeb1fd342e4')",
          "DiagnosticReport",
        );

        const jsonLabs = getAllLabJsonObjects(BundleLabNoLabIds);
        const result = getJsonLab(
          jsonLabs,
          getObservations(labReportWithoutIds!, BundleLabNoLabIds),
        );

        expect(result).toBeUndefined();
      });

      it("returns undefined if lab results html contains no tables", () => {
        const jsonLabs = getAllLabJsonObjects(BundleLab);
        const result = getJsonLab(
          jsonLabs,
          getObservations(labReportNormal!, BundleLabInvalidResultsDiv),
        );

        expect(result).toBeUndefined();
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

    describe("isAbnormalObservationInterpretation", () => {
      it("sohuld return true if code is in list of abnormal observation interpretations", () => {
        const codes = ["AA", "HH", "LL", "HU", "LU"].forEach((code) => {
          const result = isAbnormalObservationInterpretation(code);
          expect(result).toBeTrue();
        });
      });

      it("sohuld return false if code is not in list of abnormal observation interpretations", () => {
        const result = isAbnormalObservationInterpretation("ZZ");
        expect(result).toBeFalse();
      });
    });

    describe("evaluateAbnormalObservationInterpretation", () => {
      it("should return null if observations is empty", () => {
        const result = evaluateAbnormalObservationInterpretation([]);
        expect(result).toBeNull();
      });

      it("should return null if observation interpretation is undefined", () => {
        const result = evaluateAbnormalObservationInterpretation([
          {
            interpretation: undefined,
            resourceType: "Observation",
            code: { coding: undefined },
            status: "unknown",
          },
        ]);
        expect(result).toBeNull();
      });

      it("should return null if observation interpretation is empty", () => {
        const result = evaluateAbnormalObservationInterpretation([
          {
            interpretation: [],
            resourceType: "Observation",
            code: { coding: undefined },
            status: "unknown",
          },
        ]);
        expect(result).toBeNull();
      });

      it("should return null if observation interpretation coding is undefined", () => {
        const result = evaluateAbnormalObservationInterpretation([
          {
            interpretation: [{ coding: undefined }],
            resourceType: "Observation",
            code: { coding: undefined },
            status: "unknown",
          },
        ]);
        expect(result).toBeNull();
      });

      it("should return null if observation interpretation coding is empty", () => {
        const result = evaluateAbnormalObservationInterpretation([
          {
            interpretation: [{ coding: [] }],
            resourceType: "Observation",
            code: { coding: undefined },
            status: "unknown",
          },
        ]);
        expect(result).toBeNull();
      });

      it("should return null if observation interpretation coding is not HL7 observation interpretation code", () => {
        const result = evaluateAbnormalObservationInterpretation([
          {
            interpretation: [{ coding: [{ system: "http://test.com" }] }],
            resourceType: "Observation",
            code: { coding: undefined },
            status: "unknown",
          },
        ]);
        expect(result).toBeNull();
      });

      it("should return null if observation interpretation coding code is undefined", () => {
        const result = evaluateAbnormalObservationInterpretation([
          {
            interpretation: [
              {
                coding: [
                  {
                    system:
                      "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
                    code: undefined,
                  },
                ],
              },
            ],
            resourceType: "Observation",
            code: { coding: undefined },
            status: "unknown",
          },
        ]);
        expect(result).toBeNull();
      });

      it("should return null if observation interpretation coding code is not abnormal", () => {
        const result = evaluateAbnormalObservationInterpretation([
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
        ]);
        expect(result).toBeNull();
      });

      it("should return AbnormalObservationInterpretation if code is abnormal", () => {
        const result = evaluateAbnormalObservationInterpretation([
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
        ]);

        expect(result?.code).toBe("AA");
        expect(result?.display).toBe("Critical Abnormal");
      });
    });

    describe("renderLabAbnormalityTag", () => {
      it("should return null if lab report is not abnormal", () => {
        const result = renderLabAbnormalityTag(getObservations(labReportNormal!, BundleLab), labReportNormalJsonObject);
        expect(result).toBeNull();
      });

      it("should fallback to checkAbnormalTag logic when lab report is abnormal, but not one of the abnormal observation interpretations",  () => {
        const result = renderLabAbnormalityTag(getObservations(labReportAbnormal!, BundleLab), labReportAbnormalJsonObject);
        render(<>{result}</>); 
        const tagElement = screen.getByText('Abnormal');
        expect(tagElement).toBeInTheDocument();
        expect(tagElement).toHaveStyle({ backgroundColor: '#B50909' });
        expect(tagElement).toHaveClass('margin-left-105');
        expect(tagElement).not.toHaveStyle({ fontWeight: 'bold' });
      });

      it("should render abnormal tag when lab report abnormal observation interpretations has abnormal observation interpretations", () => {
        const mockObservations: Observation[] = [
          {
            resourceType: "Observation",
            status: "final",
            code: { coding: [] },
            interpretation: [
              {
                coding: [
                  {
                    system: "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
                    code: "HH",
                    display: "Critical High",
                  },
                ],
              },
            ],
          },
        ];

        const result = renderLabAbnormalityTag(mockObservations);
        render(<>{result}</>);

        const tagElement = screen.getByText("Critical High");
        expect(tagElement).toBeInTheDocument();
        expect(tagElement).toHaveStyle({ backgroundColor: '#B50909' });
        expect(tagElement).toHaveClass('margin-left-105');
        expect(tagElement).not.toHaveStyle({ fontWeight: 'bold' });
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
          getObservations(labOrganismsTableAndNarr!, BundleLab),
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
          getObservations(labReportNormal!, BundleLab),
        );

        expect(result).toBeUndefined();
      });
    });
  });

  describe("Evaluate Diagnostic Report", () => {
    it("should evaluate diagnostic report results", () => {
      const report = evaluateAll(
        BundleLab,
        fhirPathMappings.diagnosticReports,
      )[0];
      const actual = evaluateDiagnosticReportData(
        getObservations(report, BundleLab),
        BundleLab,
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
        getObservations(diagnosticReport, null as unknown as Bundle),
        null as unknown as Bundle,
      );
      expect(actual).toBeUndefined();
    });
    it("should evaluate test method results", () => {
      const report = evaluateAll(
        BundleLab,
        fhirPathMappings.diagnosticReports,
      )[0];
      const actual = evaluateDiagnosticReportData(
        getObservations(report, BundleLab),
        BundleLab,
      );

      render(actual);

      expect(
        screen.getAllByText("LAB DEVICE: BIOFIRE® FILMARRAY® 2.0 SYSTEM"),
      ).not.toBeEmpty();
    });
    it("should display comment", async () => {
      const report = evaluateAll(
        BundleLab,
        fhirPathMappings.diagnosticReports,
      )[2];
      const actual = evaluateDiagnosticReportData(
        getObservations(report, BundleLab),
        BundleLab,
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
        BundleLab,
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
      const result = combineOrgAndReportData(testResultObject, BundleLab);
      expect(result[0].organizationDisplayDataProps).toBeArray();
    });
  });

  describe("Evaluate the lab info section", () => {
    it("should return a list of LabReportElementData if the lab results in the HTML table have ID's", () => {
      const result = evaluateLabInfoData(
        BundleLab,
        evaluateAll(BundleLab, fhirPathMappings.diagnosticReports),
      );
      expect(result[0]).toHaveProperty("diagnosticReportDataItems");
      expect(result[0]).toHaveProperty("organizationDisplayDataProps");
    });

    it("should return a list of LabReportElementData even if the lab results in the HTML table do not have ID's", () => {
      const result = evaluateLabInfoData(
        BundleLabNoLabIds,
        evaluateAll(BundleLabNoLabIds, fhirPathMappings.diagnosticReports),
      );
      expect(result[0]).toHaveProperty("diagnosticReportDataItems");
      expect(result[0]).toHaveProperty("organizationDisplayDataProps");
    });

    it("should properly count the number of labs", () => {
      const result = evaluateLabInfoData(
        BundleLab,
        evaluateAll(BundleLab, fhirPathMappings.diagnosticReports),
      );
      const props = (result[0] as LabReportElementData)
        .organizationDisplayDataProps;
      expect(props[3].title).toEqual("Number of Results");
      expect(props[3].value).toEqual(2);
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
});
