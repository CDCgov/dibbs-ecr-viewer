import React from "react";

import { render, screen } from "@testing-library/react";
import { Bundle } from "fhir/r4";
import { axe } from "jest-axe";

import ClinicalInfo from "@/app/view-data/components/ClinicalInfo";
import {
  evaluateClinicalData,
  evaluateMiscNotes,
  returnProceduresTable,
} from "@/app/view-data/components/EcrDocument/clinical-data";

describe("Snapshot test for Procedures (Treatment Details)", () => {
  let container: HTMLElement;

  beforeAll(() => {
    const proceduresBundle = {
      resourceType: "Bundle",
      type: "batch",
      entry: [
        {
          fullUrl: "urn:uuid:2.16.840.1.113883.9.9.9.9.9",
          resource: {
            resourceType: "Composition",
            date: "2020-11-07T09:44:21-05:00",
            title: "Initial Public Health Case Report",
            section: [
              {
                id: "e2c29a84-7743-da0b-1df0-7b4e56c58b29",
                title: "Procedures",
                text: {
                  status: "generated",
                  div: '<table border="1" width="100%" xmlns="urn:hl7-org:v3"><thead><tr><th>Procedure</th><th>Date</th></tr></thead><tbody><tr><td>Colonic polypectomy</td><td>November 15, 2020</td></tr></tbody></table>',
                },
                code: {
                  coding: [
                    {
                      code: "47519-4",
                      system: "http://loinc.org",
                      display: "History of Procedures",
                    },
                  ],
                },
                mode: "snapshot",
                entry: [
                  {
                    reference: "Procedure/b40f0081-4052-4971-3f3b-e3d9f5e1e44d",
                  },
                  {
                    reference:
                      "Observation/44e6df0f-4e41-63ee-2bda-625369930b7c",
                  },
                ],
              },
            ],
          },
          request: {
            method: "PUT",
            url: "Composition/2.16.840.1.113883.9.9.9.9.9",
          },
        },
        {
          fullUrl: "urn:uuid:44e6df0f-4e41-63ee-2bda-625369930b7c",
          resource: {
            resourceType: "Observation",
            id: "44e6df0f-4e41-63ee-2bda-625369930b7c",
            meta: {
              profile: [
                "http://hl7.org/fhir/us/core/StructureDefinition/us-core-observationresults",
              ],
              source: "ecr",
            },
            identifier: [
              {
                system: "urn:ietf:rfc:3986",
                value: "urn:uuid:6dab0739-749d-4c62-8f5e-eea77a045ce8",
              },
            ],
            category: [
              {
                coding: [
                  {
                    system:
                      "http://terminology.hl7.org/CodeSystem/observation-category",
                    code: "procedure",
                  },
                ],
              },
            ],
            status: "final",
            code: {
              coding: [
                {
                  code: "274025005",
                  system: "http://snomed.info/sct",
                  display: "Colonic polypectomy",
                },
              ],
            },
            value: {
              coding: [{ display: "We did it!" }],
            },
            methodCode: {
              coding: [{ display: "Some how, some way" }],
            },
            effectiveDateTime: "2020-11-15",
            bodySite: {
              coding: [
                {
                  code: "416949008",
                  system: "http://snomed.info/sct",
                  display: "Abdomen and pelvis",
                },
              ],
            },
          },
          request: {
            method: "PUT",
            url: "Observation/44e6df0f-4e41-63ee-2bda-625369930b7c",
          },
        },
        {
          resource: {
            id: "b40f0081-4052-4971-3f3b-e3d9f5e1e44d",
            code: {
              coding: [
                {
                  code: "0241U",
                  system: "http://www.ama-assn.org/go/cpt",
                  display:
                    "HC INFECTIOUS DISEASE PATHOGEN SPECIFIC RNA SARS-COV-2/INF A&B/RSV UPPER RESP SPEC DETECTED OR NOT",
                },
                {
                  code: "12345",
                  system: "something that isn't loinc",
                  display: "Don't display me!",
                },
              ],
            },
            meta: {
              source: ["ecr"],
              profile: [
                "http://hl7.org/fhir/us/core/StructureDefinition/us-core-procedure",
              ],
            },
            reasonCode: [
              {
                coding: [{ display: "Struck by nonvenomous lizards, sequela" }],
              },
            ],
            status: "completed",
            subject: {
              reference: "Patient/5360b569-1354-4ece-b6a1-58b0946fc861",
            },
            identifier: [
              {
                value: "2884257^",
                system: "urn:oid:1.2.840.114350.1.13.502.3.7.1.1988.1",
              },
            ],
            resourceType: "Procedure",
            performedDateTime: "2022-06-24T12:50:00-04:00",
          },
        },
        {
          resource: {
            id: "b40f0081-4052-4971-3f3b-e3d9f5e1e44e",
            code: {
              coding: [
                {
                  code: "86308",
                  system: "http://www.ama-assn.org/go/cpt",
                  display: "HC HETEROPHILE ANTIBODIES SCREENING",
                },
                {
                  code: "12345",
                  system: "http://loinc.org",
                  display: "LOINC codes are better",
                },
              ],
            },
            meta: {
              source: ["ecr"],
              profile: [
                "http://hl7.org/fhir/us/core/StructureDefinition/us-core-procedure",
              ],
            },
            reasonCode: {
              coding: [
                {
                  display:
                    "Routine general medical examination at a health care facility",
                },
              ],
            },
            status: "completed",
            subject: {
              reference: "Patient/5360b569-1354-4ece-b6a1-58b0946fc861",
            },
            identifier: [
              {
                value: "2884257^",
                system: "urn:oid:1.2.840.114350.1.13.502.3.7.1.1988.1",
              },
            ],
            resourceType: "Procedure",
            performedPeriod: {
              start: "201611012234",
              end: "201611020243",
            },
            performer: [
              {
                actor: {
                  reference: "Organization/1234",
                },
              },
            ],
            complication: [
              {
                coding: [{ display: "Nausea" }],
              },
              {
                coding: [{ display: "Heartburn" }],
              },
            ],

            extension: [
              {
                url: "specimen",
                valueCodeableConcept: {
                  coding: [
                    {
                      code: "309266009",
                      system: "http://snomed.info/sct",
                      display: "anal polyp",
                    },
                  ],
                },
              },
              {
                url: "specimen",
                valueCodeableConcept: {
                  coding: [
                    {
                      code: "57259009",
                      system: "http://snomed.info/sct",
                      display: "bile duct",
                    },
                  ],
                },
              },
              {
                url: "priorityCode",
                valueCodeableConcept: {
                  coding: [
                    {
                      code: "CR",
                      display: "call black please",
                    },
                  ],
                },
              },
              {
                url: "http://hl7.org/fhir/StructureDefinition/procedure-method",
                valueCodeableConcept: {
                  coding: [
                    {
                      display: "the way we felt like it",
                    },
                  ],
                },
              },
              {
                url: "medicationAdministration",
                valueReference: {
                  reference:
                    "MedicationAdministration/1b8ee8b8-7e66-4cc6-7677-a8dfa341b39d",
                },
              },
            ],
            usedReference: [
              {
                reference: "Device/1c4fb2b0-801a-f762-f367-d9f03280ea97",
              },
            ],
            location: {
              reference: "Location/7df7cf78-ecc5-75ec-0746-e14deee862a3",
            },
          },
        },
        {
          fullUrl: "urn:uuid:1b8ee8b8-7e66-4cc6-7677-a8dfa341b39d",
          resource: {
            resourceType: "MedicationAdministration",
            id: "1b8ee8b8-7e66-4cc6-7677-a8dfa341b39d",
            identifier: [
              {
                system: "urn:ietf:rfc:3986",
                value: "urn:uuid:6c844c75-aa34-411c-b7bd-5e4a9f206e29",
              },
            ],
            status: "in-progress",
            effectivePeriod: {
              start: "2012-03-18",
            },
            dosage: {
              route: {
                coding: [
                  {
                    code: "C38288",
                    system: "urn:oid:2.16.840.1.113883.3.26.1.1",
                    display: "ORAL",
                  },
                ],
              },
              dose: {
                value: 1,
              },
            },
            subject: {
              reference: "Patient/f238f1ae-2f55-cd21-5c90-5e68a10af8ce",
            },
            medicationReference: {
              reference: "Medication/4361c210-6a33-4124-2863-0853046ef9a9",
            },
          },
          request: {
            method: "PUT",
            url: "MedicationAdministration/1b8ee8b8-7e66-4cc6-7677-a8dfa341b39d",
          },
        },
        {
          fullUrl: "urn:uuid:4361c210-6a33-4124-2863-0853046ef9a9",
          resource: {
            resourceType: "Medication",
            id: "4361c210-6a33-4124-2863-0853046ef9a9",
            code: {
              coding: [
                {
                  code: "197380",
                  system: "http://www.nlm.nih.gov/research/umls/rxnorm",
                  display: "Atenolol 25 MG Oral Tablet",
                },
              ],
            },
          },
          request: {
            method: "PUT",
            url: "Medication/4361c210-6a33-4124-2863-0853046ef9a9",
          },
        },
        {
          fullUrl: "urn:uuid:1c4fb2b0-801a-f762-f367-d9f03280ea97",
          resource: {
            resourceType: "Device",
            id: "1c4fb2b0-801a-f762-f367-d9f03280ea97",
            identifier: [
              {
                system: "urn:oid:2.16.840.1.113883.3.3719",
                value:
                  "(01)51022222233336(11)141231(17)150707(10)A213B1(21)1234",
                assigner: {
                  display: "FDA",
                },
              },
            ],
            type: {
              coding: [
                {
                  code: "90412006",
                  system: "http://snomed.info/sct",
                  display: "Colonoscope",
                },
              ],
            },
            meta: {
              source: "ecr",
            },
          },
          request: {
            method: "PUT",
            url: "Device/1c4fb2b0-801a-f762-f367-d9f03280ea97",
          },
        },
        {
          fullUrl: "urn:uuid:7df7cf78-ecc5-75ec-0746-e14deee862a3",
          resource: {
            resourceType: "Location",
            id: "7df7cf78-ecc5-75ec-0746-e14deee862a3",
            name: "Community Health and Hospitals",
            address: {
              line: ["1002 Healthcare Drive"],
              city: "Ann Arbor",
              state: "MI",
              country: "US",
              postalCode: "99999",
            },
            telecom: [
              {
                system: "phone",
                value: "+1(555)555-5000",
                use: "work",
              },
            ],
            type: [
              {
                coding: [
                  {
                    code: "1160-1",
                    system: "urn:oid:2.16.840.1.113883.6.259",
                    display: "Community Health and Hospitals",
                  },
                ],
              },
            ],
            meta: {
              source: "ecr",
            },
          },
          request: {
            method: "PUT",
            url: "Location/7df7cf78-ecc5-75ec-0746-e14deee862a3",
          },
        },
        {
          fullUrl: "urn:uuid:1234",
          resource: {
            resourceType: "Organization",
            id: "1234",
            name: "Good Health Hospital",
            address: [
              {
                line: ["1000 Hospital Lane"],
                city: "Ann Arbor",
                state: "MI",
                country: "US",
                postalCode: "99999",
              },
            ],
            telecom: [
              {
                system: "phone",
                value: "+1(555)-555-1212",
                use: "work",
              },
              {
                system: "fax",
                value: "+1(555)-555-3333",
                use: "work",
              },
            ],
            meta: {
              source: "ecr",
            },
          },
          request: {
            method: "PUT",
            url: "Organization/1234",
          },
        },
      ],
    } as unknown as Bundle;

    const treatmentData = [
      {
        title: "Procedures",
        value: returnProceduresTable(proceduresBundle),
      },
    ];

    container = render(
      <ClinicalInfo
        clinicalNotes={[]}
        activeProblemsDetails={[]}
        emergencyOutbreakInfo={[]}
        vitalData={[]}
        reasonForVisitDetails={[]}
        immunizationsDetails={[]}
        treatmentData={treatmentData}
      />,
    ).container;
  });
  it("should match snapshot", () => {
    expect(container).toMatchSnapshot();
  });
  it("should pass accessibility test", async () => {
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("Snapshot test for Clinical Notes", () => {
  it("should match snapshot for non table notes", async () => {
    const clinicalNotes = [
      {
        title: "Miscellaneous Notes",
        value: (
          <p>
            This patient was only recently discharged for a recurrent GI bleed
            as described
          </p>
        ),
      },
    ];
    const { container } = render(
      <ClinicalInfo
        clinicalNotes={clinicalNotes}
        activeProblemsDetails={[]}
        emergencyOutbreakInfo={[]}
        vitalData={[]}
        reasonForVisitDetails={[]}
        immunizationsDetails={[]}
        treatmentData={[]}
      />,
    );
    expect(container).toMatchSnapshot();
    expect(await axe(container)).toHaveNoViolations();
  });
  it("should match snapshot for table notes", async () => {
    const mockChildMethod = jest.fn();
    jest.spyOn(React, "useRef").mockReturnValue({
      current: {
        childMethod: mockChildMethod,
      },
    });
    const testData = `<table>
          <thead>
            <tr>
              <th>Active Problems</th>
              <th>Noted Date</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Parkinson's syndrome</td>
              <td>7/25/22</td>
            </tr>
            <tr>
              <td>Essential hypertension</td>
              <td>7/21/22</td>
            </tr>
          </tbody>
        </table>`;
    const clinicalNotes = [
      evaluateMiscNotes({
        resourceType: "Bundle",
        type: "batch",
        entry: [
          {
            // @ts-expect-error
            resource: {
              resourceType: "Composition",
              section: [
                {
                  code: {
                    coding: [
                      {
                        code: "10164-2",
                      },
                    ],
                  },
                  text: {
                    status: "generated",
                    div: testData,
                  },
                },
              ],
            },
          },
        ],
      }),
    ];
    const { container } = render(
      <ClinicalInfo
        clinicalNotes={clinicalNotes}
        activeProblemsDetails={[]}
        emergencyOutbreakInfo={[]}
        vitalData={[]}
        reasonForVisitDetails={[]}
        immunizationsDetails={[]}
        treatmentData={[]}
      />,
    );
    expect(container).toMatchSnapshot();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("Check that Clinical Info components render given FHIR bundle", () => {
  const fhirBundleClinicalInfo = require("../../../../../../test-data/fhir/BundleClinicalInfo.json");
  const testClinicalData = evaluateClinicalData(fhirBundleClinicalInfo);

  const testImmunizationsData =
    testClinicalData.immunizationsDetails.availableData;
  const testActiveProblemsData =
    testClinicalData.activeProblemsDetails.availableData;
  const testVitalSignsData = testClinicalData.vitalData.availableData;
  const testReasonForVisitData =
    testClinicalData.reasonForVisitDetails.availableData;
  const testTreatmentData = testClinicalData.treatmentData.availableData;
  const testOutbreakInfo = testClinicalData.emergencyOutbreakInfo.availableData;

  it("eCR Viewer renders immunization table given FHIR bundle with immunization info", () => {
    const clinicalInfo = render(
      <ClinicalInfo
        immunizationsDetails={testImmunizationsData}
        reasonForVisitDetails={[]}
        activeProblemsDetails={[]}
        emergencyOutbreakInfo={[]}
        vitalData={[]}
        treatmentData={[]}
        clinicalNotes={[]}
      />,
    );

    // Ensure that Immunizations Section renders
    const expectedImmunizationsElement = clinicalInfo.getByTestId(
      "immunization-history",
    );
    expect(expectedImmunizationsElement).toBeInTheDocument();

    // Ensure only one table (Immunization History) is rendering
    const expectedTable = clinicalInfo.getAllByTestId("table");
    expect(expectedTable[0]).toBeInTheDocument();
    expect(expectedTable.length).toEqual(1);
  });

  it("eCR Viewer renders active problems table given FHIR bundle with active problems info", () => {
    const clinicalInfo = render(
      <ClinicalInfo
        immunizationsDetails={[]}
        reasonForVisitDetails={[]}
        activeProblemsDetails={testActiveProblemsData}
        emergencyOutbreakInfo={[]}
        vitalData={[]}
        treatmentData={[]}
        clinicalNotes={[]}
      />,
    );

    const expectedActiveProblemsElement =
      clinicalInfo.getByTestId("active-problems");
    expect(expectedActiveProblemsElement).toBeInTheDocument();

    // Ensure only one table (Active Problems) is rendering
    const expectedTable = clinicalInfo.getAllByTestId("table");
    expect(expectedTable[0]).toBeInTheDocument();
    expect(expectedTable.length).toEqual(1);
  });

  it("eCR Viewer renders vital signs given FHIR bundle with vital signs info", () => {
    const clinicalInfo = render(
      <ClinicalInfo
        immunizationsDetails={[]}
        reasonForVisitDetails={[]}
        activeProblemsDetails={[]}
        emergencyOutbreakInfo={[]}
        vitalData={testVitalSignsData}
        treatmentData={[]}
        clinicalNotes={[]}
      />,
    );

    const expectedVitalSignsElement = clinicalInfo.getByTestId("vital-signs");
    expect(expectedVitalSignsElement).toBeInTheDocument();

    // Ensure only one table (Vital Signs) is rendering
    const expectedTable = clinicalInfo.getAllByTestId("table");
    expect(expectedTable.length).toEqual(1);
    expect(expectedTable[0]).toBeInTheDocument();

    // Check Vital Signs table contents
    const expectedValues = [
      "60 in",
      "152.4 cm",
      "140 lb",
      "63.5 kg",
      "20 kg/m2",
    ];
    const expectedDate = "02/04/2025 12:48 PM EST";

    // Check if all expected values are present in the document
    expectedValues.forEach((value) => {
      expect(screen.getByText(value)).toBeInTheDocument();
    });
    const numVitalSignsDate = screen.getAllByText(expectedDate);
    expect(numVitalSignsDate.length).toBe(5);
  });

  it("eCR Viewer renders reason for visit given FHIR bundle with reason for visit info", () => {
    const clinicalInfo = render(
      <ClinicalInfo
        immunizationsDetails={[]}
        reasonForVisitDetails={testReasonForVisitData}
        activeProblemsDetails={[]}
        emergencyOutbreakInfo={[]}
        vitalData={[]}
        treatmentData={[]}
        clinicalNotes={[]}
      />,
    );

    const expectedReasonForVisitElement =
      clinicalInfo.getByTestId("reason-for-visit");
    expect(expectedReasonForVisitElement).toBeInTheDocument();
  });

  it("eCR Viewer renders treatment data given FHIR bundle with treatment data info", () => {
    const clinicalInfo = render(
      <ClinicalInfo
        immunizationsDetails={[]}
        reasonForVisitDetails={[]}
        activeProblemsDetails={[]}
        emergencyOutbreakInfo={[]}
        vitalData={[]}
        treatmentData={testTreatmentData}
        clinicalNotes={[]}
      />,
    );

    const expectedTreatmentElement =
      clinicalInfo.getByTestId("treatment-details");
    expect(expectedTreatmentElement).toBeInTheDocument();

    const expectedTable = clinicalInfo.getAllByTestId("table");
    expect(expectedTable[0]).toBeInTheDocument();
    expect(expectedTable.length).toEqual(4);
  });

  it("eCR Viewer renders emergency outbreak info given FHIR bundle with emergency outbreak info", () => {
    const clinicalInfo = render(
      <ClinicalInfo
        immunizationsDetails={[]}
        reasonForVisitDetails={[]}
        activeProblemsDetails={[]}
        emergencyOutbreakInfo={testOutbreakInfo}
        vitalData={[]}
        treatmentData={[]}
        clinicalNotes={[]}
      />,
    );
    const expectedEmergencyOutbreakElement = clinicalInfo.getByTestId(
      "emergency-outbreak-info",
    );
    expect(expectedEmergencyOutbreakElement).toBeInTheDocument();
  });

  it("eCR Viewer renders all Clinical Info sections", () => {
    const clinicalInfo = render(
      <ClinicalInfo
        immunizationsDetails={testImmunizationsData}
        reasonForVisitDetails={testReasonForVisitData}
        activeProblemsDetails={testActiveProblemsData}
        emergencyOutbreakInfo={[]}
        vitalData={testVitalSignsData}
        treatmentData={testTreatmentData}
        clinicalNotes={[]}
      />,
    );

    const expectedImmunizationsElement = clinicalInfo.getByTestId(
      "immunization-history",
    );
    expect(expectedImmunizationsElement).toBeInTheDocument();

    const expectedActiveProblemsElement =
      clinicalInfo.getByTestId("active-problems");
    expect(expectedActiveProblemsElement).toBeInTheDocument();

    const expectedTreatmentElement =
      clinicalInfo.getByTestId("treatment-details");
    expect(expectedTreatmentElement).toBeInTheDocument();

    const expectedTable = clinicalInfo.getAllByTestId("table");
    expect(expectedTable[0]).toBeInTheDocument();
    expect(expectedTable.length).toEqual(7);

    const expectedVitalSignsElement = clinicalInfo.getByTestId("vital-signs");
    expect(expectedVitalSignsElement).toBeInTheDocument();

    const expectedReasonForVisitElement =
      clinicalInfo.getByTestId("reason-for-visit");
    expect(expectedReasonForVisitElement).toBeInTheDocument();
  });
});
