import { fireEvent, render, screen } from "@testing-library/react";

import BundleNoActiveProblems from "@/../../../test-data/fhir/BundleNoActiveProblems.json";
import { Bundle } from "@/app/types";
import { evaluateAll } from "@/app/utils/evaluate";
import fhirPathMappings from "@/app/utils/evaluate/fhir-paths";
import {
  evaluateClinicalData,
  returnMedicationsTable,
  returnProblemsTable,
} from "@/app/view-data/services/clinicalInfoService";
import { getFhirIndex } from "@/app/view-data/services/fhirResourcesIndexService";

describe("Render Active Problem table", () => {
  it.each(["20240101120000+0000", "2024-01-01T12:00:00Z"])(
    "shows the correct age at onset for timestamp %s",
    (onsetDateTime) => {
      const bundle: Bundle = {
        resourceType: "Bundle",
        type: "collection",
        entry: [
          {
            resource: {
              resourceType: "Patient",
              id: "patient",
              birthDate: "2000-01-01",
            },
          },
        ],
      };
      const table = returnProblemsTable(bundle, getFhirIndex(bundle), [
        {
          resourceType: "Condition",
          subject: { reference: "Patient/patient" },
          code: { coding: [{ display: "Fever" }] },
          onsetDateTime,
        },
      ]);

      render(table);

      expect(screen.getByText("24 years")).toBeVisible();
      expect(screen.queryByText("0 days")).not.toBeInTheDocument();
    },
  );

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
    expect(medicationDetails?.textContent).toContain(
      "First medication note\nSecond medication note",
    );
  });
});

describe("Planned Procedures & Orders dates", () => {
  it("shows Scheduled Time and Ordered On in the browser's timezone", () => {
    const bundle: Bundle = {
      resourceType: "Bundle",
      type: "document",
      entry: [
        {
          resource: {
            resourceType: "CarePlan",
            status: "active",
            intent: "plan",
            subject: { reference: "Patient/patient" },
            activity: [
              { reference: { reference: "ServiceRequest/planned-procedure" } },
              { reference: { reference: "ServiceRequest/planned-datetime" } },
            ],
          },
        },
        {
          resource: {
            resourceType: "ServiceRequest",
            id: "planned-procedure",
            status: "active",
            intent: "order",
            subject: { reference: "Patient/patient" },
            code: { text: "Scheduled procedure" },
            occurrencePeriod: {
              start: "2026-07-02T02:00:00Z",
              end: "2026-07-02T03:00:00Z",
            },
            authoredOn: "2026-01-01T15:00:00Z",
          },
        },
        {
          resource: {
            resourceType: "ServiceRequest",
            id: "planned-datetime",
            status: "active",
            intent: "order",
            subject: { reference: "Patient/patient" },
            code: { text: "Second scheduled procedure" },
            occurrenceDateTime: "2026-07-01T18:30:00+03:00",
            authoredOn: "2026-07-01",
          },
        },
      ],
    };
    const result = evaluateClinicalData(bundle, getFhirIndex(bundle));
    const plan = result.treatmentData.availableData.find(
      ({ title }) => title === "Plan of Treatment",
    );
    const { container } = render(plan?.value);
    expect(screen.getByText("Planned Procedures & Orders")).toBeInTheDocument();
    expect(screen.getByText("Scheduled Time")).toBeInTheDocument();
    expect(screen.getByText("Ordered On")).toBeInTheDocument();
    expect(container.textContent).toContain(
      "Start: 07/01/2026 10:00\u00a0PM\u00a0EDT",
    );
    expect(container.textContent).toContain(
      "End: 07/01/2026 11:00\u00a0PM\u00a0EDT",
    );
    expect(container.textContent).toContain(
      "01/01/2026 10:00\u00a0AM\u00a0EST",
    );
    expect(container.textContent).toContain(
      "07/01/2026 11:30\u00a0AM\u00a0EDT",
    );
    expect(screen.getByText("07/01/2026")).toBeInTheDocument();
  });
});
