import { render, screen } from "@testing-library/react";
import { Bundle, Condition } from "fhir/r4";
import { axe } from "jest-axe";

import BundleWithPatient from "../../../../../../test-data/fhir/BundlePatient.json";
import { returnProblemsTable } from "@/app/view-data/components/common";

describe("Active Problems Table", () => {
  let container: HTMLElement;
  beforeEach(() => {
    const activeProblemsData: Condition[] = [
      {
        id: "80db768f-19ea-f1d0-f9e5-22d854d7acc5",
        code: {
          coding: [
            {
              code: "C50.312",
              system: "urn:oid:2.16.840.1.113883.6.90",
              display:
                "Malignant neoplasm of lower-inner quadrant of left breast in female, estrogen receptor positive",
            },
          ],
        },
        subject: {
          reference: "Patient/34080650-1e86-08fe-c2c9-faa37629edd3",
        },
        category: [
          {
            coding: [
              {
                code: "problem-item-list",
                system:
                  "http://hl7.org/fhir/us/core/ValueSet/us-core-condition-category",
                display: "Problem List Item",
              },
            ],
          },
        ],
        identifier: [
          {
            value: "100952",
            system: "urn:oid:1.2.840.114350.1.13.297.3.7.2.768076",
          },
        ],
        resourceType: "Condition",
        onsetDateTime: "12/14/2022",
        onsetAge: { value: 123 },
        clinicalStatus: {
          coding: [
            {
              code: "55561003",
              system: "http://snomed.info/sct",
              display: "Active",
            },
          ],
        },
        note: [{ text: "Test note" }],
      },
      {
        id: "4f962a2f-db60-0b87-20cc-557e17124451",
        code: {
          coding: [
            {
              code: "R51.9",
              system: "urn:oid:2.16.840.1.113883.6.90",
              display: "Headache",
            },
          ],
        },
        subject: {
          reference: "Patient/34080650-1e86-08fe-c2c9-faa37629edd3",
        },
        category: [
          {
            coding: [
              {
                code: "problem-item-list",
                system:
                  "http://hl7.org/fhir/us/core/ValueSet/us-core-condition-category",
                display: "Problem List Item",
              },
            ],
          },
        ],
        identifier: [
          {
            value: "95240",
            system: "urn:oid:1.2.840.114350.1.13.297.3.7.2.768076",
          },
        ],
        resourceType: "Condition",
        onsetAge: { value: 152 },
        clinicalStatus: {
          coding: [
            {
              code: "55561003",
              system: "http://snomed.info/sct",
              display: "Active",
            },
          ],
        },
      },
      {
        id: "9e465247-8dbb-f778-dd7f-4d56c59485b5",
        code: {
          coding: [
            {
              code: "M54.9",
              system: "urn:oid:2.16.840.1.113883.6.90",
              display: "Backache",
            },
          ],
        },
        subject: {
          reference: "Patient/34080650-1e86-08fe-c2c9-faa37629edd3",
        },
        category: [
          {
            coding: [
              {
                code: "problem-item-list",
                system:
                  "http://hl7.org/fhir/us/core/ValueSet/us-core-condition-category",
                display: "Problem List Item",
              },
            ],
          },
        ],
        identifier: [
          {
            value: "95252",
            system: "urn:oid:1.2.840.114350.1.13.297.3.7.2.768076",
          },
        ],
        resourceType: "Condition",
        onsetDateTime: "08/19/2018 1:00 PM",
        clinicalStatus: {
          coding: [
            {
              code: "55561003",
              system: "http://snomed.info/sct",
              display: "Active",
            },
          ],
        },
      },
      {
        id: "4f962a2f-db60-0b87-20cc-557e17124452",
        code: {
          coding: [
            {
              code: "R51.9",
              system: "urn:oid:2.16.840.1.113883.6.90",
              display: "Headache",
            },
          ],
        },
        subject: {
          reference: "Patient/34080650-1e86-08fe-c2c9-faa37629edd3",
        },
        category: [
          {
            coding: [
              {
                code: "problem-item-list",
                system:
                  "http://hl7.org/fhir/us/core/ValueSet/us-core-condition-category",
                display: "Problem List Item",
              },
            ],
          },
        ],
        identifier: [
          {
            value: "95240",
            system: "urn:oid:1.2.840.114350.1.13.297.3.7.2.768076",
          },
        ],
        resourceType: "Condition",
        onsetAge: { value: 1 },
        clinicalStatus: {
          coding: [
            {
              code: "55561003",
              system: "http://snomed.info/sct",
              display: "Active",
            },
          ],
        },
      },
      {
        id: "9e465247-8dbb-f778-dd7f-4d56c59485b0",
        code: {
          coding: [
            {
              code: "M54.9",
              system: "urn:oid:2.16.840.1.113883.6.90",
              display: "Backache",
            },
          ],
        },
        subject: {
          reference: "Patient/34080650-1e86-08fe-c2c9-faa37629edd3",
        },
        category: [
          {
            coding: [
              {
                code: "problem-item-list",
                system:
                  "http://hl7.org/fhir/us/core/ValueSet/us-core-condition-category",
                display: "Problem List Item",
              },
            ],
          },
        ],
        identifier: [
          {
            value: "95252",
            system: "urn:oid:1.2.840.114350.1.13.297.3.7.2.768076",
          },
        ],
        resourceType: "Condition",
        onsetDateTime: "06/28/1877",
        clinicalStatus: {
          coding: [
            {
              code: "55561003",
              system: "http://snomed.info/sct",
              display: "Active",
            },
          ],
        },
      },
    ];
    container = render(
      returnProblemsTable(
        BundleWithPatient as unknown as Bundle,
        activeProblemsData,
      )!,
    ).container;
  });
  it("should match snapshot", () => {
    expect(container).toMatchSnapshot();
  });
  it("should pass accessibility test", async () => {
    expect(await axe(container)).toHaveNoViolations();
  });
  it("should use or calculate onset age", () => {
    expect(screen.getByText("123 years")).toBeInTheDocument();
    expect(screen.getByText("152 years")).toBeInTheDocument();
    expect(screen.getByText("141 years")).toBeInTheDocument();
    expect(screen.getByText("1 year")).toBeInTheDocument();

    // Uses the fallback `onsetDateTime` if no year is available
    expect(screen.getByText("1 month, 3 days")).toBeInTheDocument();
  });
});
