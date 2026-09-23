import { fireEvent, render, screen } from "@testing-library/react";
import { ReactElement } from "react";
import { Bundle } from "@/app/types";
import fhirPathMappings from "@/app/utils/evaluate/fhir-paths";
import { getFhirIndex } from "@/app/view-data/services/fhirResourcesIndexService";
import { evaluateAll } from "@/app/utils/evaluate";
import {
  evaluateClinicalData,
  returnMedicationsTable,
  returnProblemsTable,
} from "@/app/view-data/services/clinicalInfoService";
import BundleNoActiveProblems from "@/../../../test-data/fhir/BundleNoActiveProblems.json";

describe("Render Active Problem table", () => {
  it("should return empty if active problem name is undefined", () => {
    const fhirIndex = getFhirIndex(BundleNoActiveProblems as unknown as Bundle);
    const actual = returnProblemsTable(
      BundleNoActiveProblems as unknown as Bundle,
      fhirIndex,
      evaluateAll(
        BundleNoActiveProblems as unknown as Bundle,
        fhirPathMappings.activeProblems,
      ),
    );
    expect(actual).toBeUndefined();
  });

  it("should display multiple notes for an active problem", () => {
    const bundleWithMultipleNotes: Bundle = {
      resourceType: "Bundle",
      type: "document",
      entry: [
        {
          resource: {
            resourceType: "Condition",
            id: "active-problem-with-notes",
            category: [
              {
                coding: [
                  {
                    system:
                      "http://hl7.org/fhir/us/core/ValueSet/us-core-condition-category",
                    code: "problem-item-list",
                  },
                ],
              },
            ],
            code: {
              coding: [
                {
                  system: "http://snomed.info/sct",
                  code: "386661006",
                  display: "Fever",
                },
              ],
            },
            clinicalStatus: {
              coding: [
                {
                  system:
                    "http://terminology.hl7.org/CodeSystem/condition-clinical",
                  code: "active",
                  display: "Active",
                },
              ],
            },
            subject: {
              reference: "Patient/example",
            },
            note: [
              { text: "First active problem note" },
              { text: "Second active problem note" },
            ],
          },
        },
      ],
    };
    const fhirIndex = getFhirIndex(bundleWithMultipleNotes);

    render(
      returnProblemsTable(
        bundleWithMultipleNotes,
        fhirIndex,
        evaluateAll(bundleWithMultipleNotes, fhirPathMappings.activeProblems),
      ),
    );

    const commentButton = screen.getByRole("button", {
      name: /view comment/i,
    });

    fireEvent.click(commentButton);

    const comments = document.getElementById(
      commentButton.getAttribute("aria-controls") ?? "",
    );

    expect(comments?.textContent).toContain("First active problem note");
    expect(comments?.textContent).toContain("Second active problem note");
    expect(comments?.querySelectorAll("br")).toHaveLength(1);
  });
});

describe("Render Medications table", () => {
  it("should display multiple notes for a medication", () => {
    const bundleWithMultipleNotes: Bundle = {
      resourceType: "Bundle",
      type: "document",
      entry: [
        {
          resource: {
            resourceType: "Composition",
            id: "composition-with-medication",
            status: "final",
            type: {
              coding: [{ code: "34133-9", system: "http://loinc.org" }],
            },
            date: "2026-01-01",
            author: [{ reference: "Practitioner/example" }],
            title: "Test composition",
            section: [
              {
                code: {
                  coding: [{ code: "10160-0", system: "http://loinc.org" }],
                },
                entry: [{ reference: "urn:uuid:medication-with-notes" }],
              },
            ],
          },
        },
        {
          fullUrl: "urn:uuid:medication-with-notes",
          resource: {
            resourceType: "MedicationStatement",
            status: "active",
            medicationReference: { reference: "urn:uuid:test-medication" },
            subject: {
              reference: "Patient/example",
            },
            note: [
              { text: "First medication note" },
              { text: "Second medication note" },
            ],
          },
        },
        {
          fullUrl: "urn:uuid:test-medication",
          resource: {
            resourceType: "Medication",
            code: { text: "Test medication" },
          },
        },
      ],
    };

    render(returnMedicationsTable(bundleWithMultipleNotes));

    const medicationButton = screen.getByRole("button", {
      name: /test medication/i,
    });

    fireEvent.click(medicationButton);

    const medicationDetails = document.getElementById(
      medicationButton.getAttribute("aria-controls") ?? "",
    );

    expect(medicationDetails).toBeVisible();
    expect(medicationDetails?.textContent).toContain(
      "First medication note\nSecond medication note",
    );
  });

  it("resolves idless plan requests by URN and classifies their resource types", () => {
    const bundle: Bundle = {
      resourceType: "Bundle",
      type: "document",
      entry: [
        {
          resource: {
            resourceType: "CarePlan",
            status: "active",
            intent: "plan",
            subject: { reference: "Patient/example" },
            activity: [
              { reference: { reference: "urn:uuid:planned-procedure" } },
              { reference: { reference: "urn:uuid:planned-medication" } },
              { reference: { reference: "urn:uuid:not-a-request" } },
            ],
          },
        },
        {
          fullUrl: "urn:uuid:planned-procedure",
          resource: {
            resourceType: "ServiceRequest",
            status: "active",
            intent: "order",
            subject: { reference: "Patient/example" },
            code: { text: "URN procedure order" },
          },
        },
        {
          fullUrl: "urn:uuid:planned-medication",
          resource: {
            resourceType: "MedicationRequest",
            status: "active",
            intent: "order",
            subject: { reference: "Patient/example" },
            medicationCodeableConcept: { text: "URN medication order" },
          },
        },
        {
          fullUrl: "urn:uuid:not-a-request",
          resource: {
            resourceType: "Observation",
            status: "final",
            code: { text: "Wrong plan resource type" },
          },
        },
      ],
    };
    const planOfTreatment = evaluateClinicalData(
      bundle,
      getFhirIndex(bundle),
    ).treatmentData.availableData.find(
      ({ title }) => title === "Plan of Treatment",
    );

    render(planOfTreatment?.value as ReactElement);

    expect(screen.getByText("URN procedure order")).toBeInTheDocument();
    expect(screen.getByText("URN medication order")).toBeInTheDocument();
    expect(
      screen.queryByText("Wrong plan resource type"),
    ).not.toBeInTheDocument();
  });
});
