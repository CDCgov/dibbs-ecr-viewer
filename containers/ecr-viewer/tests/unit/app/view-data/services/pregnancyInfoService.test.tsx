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
  it.each([
    { value: "Unknown", effectiveDateTime: undefined, available: false },
    {
      value: "Not planning pregnancy",
      effectiveDateTime: undefined,
      available: true,
    },
    {
      value: "Unknown",
      effectiveDateTime: "2024-01-01T12:00:00Z",
      available: true,
    },
  ])(
    "marks '$value' as available=$available when the effective date is $effectiveDateTime",
    ({ value, effectiveDateTime, available }) => {
      const bundle: Bundle = {
        resourceType: "Bundle",
        type: "collection",
        entry: [
          {
            resource: {
              resourceType: "Observation",
              status: "final",
              code: {
                coding: [{ system: "http://loinc.org", code: "86645-9" }],
              },
              valueString: value,
              effectiveDateTime,
            },
          },
        ],
      };
      const result = evaluatePregnancyData(bundle, getFhirIndex(bundle));
      const title = "Pregnancy Intention in the Next Year";

      expect(result.availableData.some((item) => item.title === title)).toBe(
        available,
      );
      expect(result.unavailableData.some((item) => item.title === title)).toBe(
        !available,
      );
      if (available) {
        const { container } = render(
          result.availableData.find((item) => item.title === title)?.value,
        );
        expect(container.textContent).toContain(value);
        if (effectiveDateTime)
          expect(container.querySelector("time")).toHaveAttribute(
            "dateTime",
            effectiveDateTime,
          );
      }
    },
  );

  it("should have no available data when there is no data", () => {
    const actual = evaluatePregnancyData(undefined as any, {
      fhirIndexByType: {},
      fhirIndexByTypeAndId: {},
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
      fhirIndexByTypeAndId: {},
    });
    render(actual.availableData[0].value);
    expect(screen.getAllByText("Pregnancy Status").length).toEqual(1);
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
      fhirIndexByTypeAndId: {},
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
      fhirIndexByTypeAndId: {},
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
      fhirIndexByTypeAndId: {},
    });
    render(<PregnancyInfo pregnancyData={actual.availableData} />);
    expect(screen.getByText("Last Menstrual Period")).toBeVisible();
    expect(screen.getByText("01/01/2020")).toBeVisible();
  });
});
