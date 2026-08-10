import { fireEvent, render, screen } from "@testing-library/react";
import { Bundle } from "fhir/r4";
import fhirPathMappings from "@/app/utils/evaluate/fhir-paths";
import { getFhirIndex } from "@/app/view-data/services/fhirResourcesIndexService";
import { evaluateAll } from "@/app/utils/evaluate";
import {
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
                entry: [
                  { reference: "MedicationStatement/medication-with-notes" },
                ],
              },
            ],
          },
        },
        {
          resource: {
            resourceType: "MedicationStatement",
            id: "medication-with-notes",
            status: "active",
            medicationReference: { reference: "Medication/test-medication" },
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
          resource: {
            resourceType: "Medication",
            id: "test-medication",
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
    expect(medicationDetails?.textContent).toContain("First medication note\nSecond medication note");
  });
});
