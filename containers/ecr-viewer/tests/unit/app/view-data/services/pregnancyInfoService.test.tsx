import { render, screen } from "@testing-library/react";

import * as _BundleWithPregnancyStatus from "@/../../../test-data/fhir/BundlePregnancyStatus.json";
import { Bundle } from "@/app/types";
import PregnancyInfo from "@/app/view-data/components/PregnancyInfo";
import { evaluatePregnancyData } from "@/app/view-data/services/pregnancyInfoService";
import { getFhirIndex } from "@/app/view-data/services/fhirResourcesIndexService";

const BundleWithPregnancyStatus =
  _BundleWithPregnancyStatus as unknown as Bundle;
const fhirIndexBundleWithPregnancyStatus = getFhirIndex(
  BundleWithPregnancyStatus,
);

describe("Evaluate Patient Info: Pregnancy Info", () => {
  it("should have no available data when there is no data", () => {
    const actual = evaluatePregnancyData(undefined as any, {
      fhirIndexByType: {},
      fhirIndexByReference: {},
    });

    expect(actual.availableData).toBeEmpty();
    expect(actual.unavailableData).not.toBeEmpty();
  });

  it("should have pregnancy status data when it exists", () => {
    const pregnancyBundle: Bundle = {
      resourceType: "Bundle",
      type: "batch",
      entry: [
        {
          resource: {
            resourceType: "Observation",
            meta: {
              profile: [
                "http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-pregnancy-status-observation",
              ],
              source: "ecr",
            },
            status: "final",
            code: {
              coding: [
                {
                  code: "82810-3",
                  system: "http://loinc.org",
                },
              ],
            },
            valueCodeableConcept: {
              coding: [
                {
                  code: "77386006",
                  system: "http://snomed.info/sct",
                },
              ],
            },
            effectivePeriod: {
              start: "2017-08-26",
            },
          },
        },
      ],
    };
    const actual = evaluatePregnancyData(pregnancyBundle, {
      fhirIndexByType: {},
      fhirIndexByReference: {},
    });
    render(actual.availableData[0].value);
    expect(screen.getAllByText("Pregnancy Status").length).toEqual(1);
  });

  it("should associate pregnancy outcomes through canonical references", () => {
    const pregnancyBundle = {
      resourceType: "Bundle",
      type: "document",
      entry: [
        {
          fullUrl: "urn:uuid:pregnancy-status",
          resource: {
            resourceType: "Observation",
            id: "pregnancy-status",
            status: "final",
            code: {
              coding: [{ system: "http://loinc.org", code: "82810-3" }],
            },
            valueCodeableConcept: { text: "Pregnant" },
          },
        },
        {
          fullUrl: "urn:uuid:pregnancy-outcome",
          resource: {
            resourceType: "Observation",
            id: "pregnancy-outcome",
            status: "final",
            code: {
              coding: [{ system: "http://loinc.org", code: "63893-2" }],
            },
            valueCodeableConcept: { text: "Live birth outcome" },
            focus: [{ reference: "Observation/pregnancy-status" }],
          },
        },
      ],
    } as unknown as Bundle;

    const actual = evaluatePregnancyData(
      pregnancyBundle,
      getFhirIndex(pregnancyBundle),
    );

    render(<PregnancyInfo pregnancyData={actual.availableData} />);
    expect(screen.getByText("Live birth outcome")).toBeVisible();
  });

  it("should resolve pregnancy section entries and filter by target type", () => {
    const pregnancyBundle = {
      resourceType: "Bundle",
      type: "document",
      entry: [
        {
          fullUrl: "urn:uuid:composition",
          resource: {
            resourceType: "Composition",
            id: "composition",
            status: "final",
            type: { text: "Pregnancy document" },
            date: "2020-01-05",
            author: [],
            title: "Pregnancy document",
            section: [
              {
                code: {
                  coding: [{ system: "http://loinc.org", code: "90767-5" }],
                },
                entry: [
                  {
                    reference:
                      "MedicationAdministration/medication-administration",
                  },
                  { reference: "Observation/not-medication-administration" },
                ],
              },
            ],
          },
        },
        {
          fullUrl: "urn:uuid:medication-administration",
          resource: {
            resourceType: "MedicationAdministration",
            id: "medication-administration",
            status: "completed",
            medicationReference: { reference: "Medication/medication" },
            subject: { reference: "Patient/patient" },
          },
        },
        {
          fullUrl: "urn:uuid:medication",
          resource: {
            resourceType: "Medication",
            id: "medication",
            code: { text: "Prenatal vitamin" },
          },
        },
        {
          fullUrl: "urn:uuid:not-medication-administration",
          resource: {
            resourceType: "Observation",
            id: "not-medication-administration",
            status: "final",
            code: { text: "Not a medication administration" },
          },
        },
      ],
    } as unknown as Bundle;

    const actual = evaluatePregnancyData(
      pregnancyBundle,
      getFhirIndex(pregnancyBundle),
    );

    expect(
      actual.availableData.find(
        ({ title }) => title === "Medications Administered",
      )?.value,
    ).toBe("Prenatal vitamin\n");
  });

  it("should display all pregnancy data ", () => {
    const actual = evaluatePregnancyData(
      BundleWithPregnancyStatus,
      fhirIndexBundleWithPregnancyStatus,
    );

    actual.availableData.forEach((data) => {
      const { container } = render(data.value);
      expect(container).toMatchSnapshot();
    });
  });

  it("should display nothing when no pregnancy data is available", () => {
    const actual = evaluatePregnancyData({} as unknown as Bundle, {
      fhirIndexByType: {},
      fhirIndexByReference: {},
    });
    expect(actual.availableData).toBeEmpty();
  });

  it("should have postpartum status data when it exists", () => {
    const pregnancyBundle: Bundle = {
      resourceType: "Bundle",
      type: "batch",
      entry: [
        {
          resource: {
            resourceType: "Observation",
            status: "final",
            code: {
              coding: [
                {
                  code: "249197004",
                  system: "http://snomed.info/sct",
                },
              ],
            },
            effectiveDateTime: "2020-01-05T10:15:00",
          },
        },
      ],
    };
    const actual = evaluatePregnancyData(pregnancyBundle, {
      fhirIndexByType: {},
      fhirIndexByReference: {},
    });
    render(<PregnancyInfo pregnancyData={actual.availableData} />);
    expect(screen.getAllByText("Postpartum Status").length).toEqual(1);
  });

  it("should have last menstrual period data when it exists", () => {
    const pregnancyBundle: Bundle = {
      resourceType: "Bundle",
      type: "batch",
      entry: [
        {
          resource: {
            resourceType: "Observation",
            id: "test_obs",
            status: "final",
            code: {
              coding: [
                {
                  code: "8665-2",
                  system: "http://loinc.org",
                  display: "Last menstrual period start date",
                },
              ],
            },
            effectiveDateTime: "2020-01-05T10:15:00",
            valueDateTime: "2020-01-01",
          },
        },
      ],
    };
    const actual = evaluatePregnancyData(pregnancyBundle, {
      fhirIndexByType: {},
      fhirIndexByReference: {},
    });
    render(<PregnancyInfo pregnancyData={actual.availableData} />);
    expect(screen.getByText("Last Menstrual Period")).toBeVisible();
    expect(screen.getByText("01/01/2020")).toBeVisible();
  });
});
