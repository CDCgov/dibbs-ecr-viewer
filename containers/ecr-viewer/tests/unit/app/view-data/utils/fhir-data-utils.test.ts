import { Observation } from "fhir/r4";

import fhirPathMappings from "@/app/utils/evaluate/fhir-paths";
import { sortResourcesByDate } from "@/app/view-data/utils/fhir-data-utils";

describe("sortObservationsByDate", () => {
  it("should prioritize ongoing periods", () => {
    const oldest: Observation = {
      resourceType: "Observation",
      code: {
        text: "oldest",
      },
      status: "unknown",
      effectiveDateTime: "2000-01-01",
    };
    const ongoing: Observation = {
      resourceType: "Observation",
      code: {
        text: "ongoing",
      },
      status: "unknown",
      effectivePeriod: { start: "2002-01-01" },
    };
    const newest: Observation = {
      resourceType: "Observation",
      code: {
        text: "newest",
      },
      status: "unknown",
      effectivePeriod: { start: "2025-01-01", end: "2025-02-01" },
    };

    const arr = [newest, ongoing, oldest];
    sortResourcesByDate(arr, fhirPathMappings.effectiveX);
    expect(arr).toEqual([ongoing, newest, oldest]);
  });

  it("should prioritize newer start when end is the same", () => {
    const oldest: Observation = {
      resourceType: "Observation",
      code: {
        text: "oldest",
      },
      status: "unknown",
      effectivePeriod: { start: "2000-01-01", end: "2025-02-01" },
    };
    const middle: Observation = {
      resourceType: "Observation",
      code: {
        text: "ongoing",
      },
      status: "unknown",
      effectivePeriod: { start: "2010-01-01", end: "2020-01-01" },
    };
    const newest: Observation = {
      resourceType: "Observation",
      code: {
        text: "newest",
      },
      status: "unknown",
      effectivePeriod: { start: "2025-01-01", end: "2025-02-01" },
    };

    const arr = [oldest, middle, newest];
    sortResourcesByDate(arr, fhirPathMappings.effectiveX);
    expect(arr).toEqual([newest, oldest, middle]);
  });

  it("should prioritize newer end", () => {
    const oldest: Observation = {
      resourceType: "Observation",
      code: {
        text: "oldest",
      },
      status: "unknown",
      effectivePeriod: { start: "2000-01-01", end: "2025-02-01" },
    };
    const middle: Observation = {
      resourceType: "Observation",
      code: {
        text: "ongoing",
      },
      status: "unknown",
      effectivePeriod: { start: "2000-01-01" },
    };
    const newest: Observation = {
      resourceType: "Observation",
      code: {
        text: "newest",
      },
      status: "unknown",
      effectivePeriod: { start: "2000-01-01", end: "2025-01-01" },
    };

    const arr = [oldest, middle, newest];
    sortResourcesByDate(arr, fhirPathMappings.effectiveX);
    expect(arr).toEqual([middle, oldest, newest]);
  });
});
