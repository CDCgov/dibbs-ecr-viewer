import { Bundle, Composition, Observation, Patient } from "fhir/r4";

import {
  FhirIndex,
  clearFhirIndexCache,
  getFhirIndex,
  getOneResourceByType,
  getResourceById,
  getResourcesByType,
} from "@/app/view-data/services/fhirResourcesIndexService";

const resource1 = {
  fullUrl: "urn:uuid:1",
  resource: {
    resourceType: "Composition",
    id: "1",
  },
};
const resource2 = {
  fullUrl: "urn:uuid:2",
  resource: {
    resourceType: "Observation",
    id: "2",
  },
};
const resource3 = {
  fullUrl: "urn:uuid:3",
  resource: {
    resourceType: "Observation",
    id: "3",
  },
};
const BundleSample = {
  resourceType: "Bundle",
  type: "document",
  entry: [resource1, resource2, resource3],
} as unknown as Bundle;
const fhirIndexBundleSample = {
  fhirIndexByType: {
    Composition: [resource1.resource],
    Observation: [resource2.resource, resource3.resource],
  },
  fhirIndexByTypeAndId: {
    Composition: {
      "1": resource1.resource,
    },
    Observation: {
      "2": resource2.resource,
      "3": resource3.resource,
    },
  },
};

describe("fhirResourcesIndexService Tests", () => {
  describe("getFhirIndex Tests", () => {
    it("reuses the index only for the same bundle object", () => {
      const index = getFhirIndex(BundleSample);
      expect(getFhirIndex(BundleSample)).toBe(index);
      expect(getFhirIndex({ ...BundleSample })).not.toBe(index);
    });
    it("rebuilds the index when its cache is cleared", () => {
      const index = getFhirIndex(BundleSample);
      clearFhirIndexCache();
      expect(getFhirIndex(BundleSample)).not.toBe(index);
    });
    it("flags duplicate IDs within a resource type and keeps the existing indexed result", () => {
      const duplicate: Observation = {
        resourceType: "Observation",
        id: "2",
        status: "final",
        code: {},
      };
      const index = getFhirIndex({
        ...BundleSample,
        entry: [...BundleSample.entry!, { resource: duplicate }],
      });

      expect(index.hasDuplicateIds).toBe(true);
      expect(getResourceById(index, "Observation", "2")).toBe(duplicate);
      expect(getResourcesByType(index, "Observation")).toHaveLength(3);
    });
    it("distinguishes resource types that share an ID", () => {
      const patient: Patient = { resourceType: "Patient", id: "2" };
      const index = getFhirIndex({
        ...BundleSample,
        entry: [...BundleSample.entry!, { resource: patient }],
      });

      expect(index.hasDuplicateIds).toBeUndefined();
      expect(getResourceById(index, "Patient", "2")).toBe(patient);
      expect(getResourceById(index, "Observation", "2")).toBe(
        resource2.resource,
      );
    });
    it.each(["__proto__", "constructor", "toString"])(
      "indexes a resource with the ID %s without treating it as a duplicate",
      (id) => {
        const patient: Patient = { resourceType: "Patient", id };
        const index = getFhirIndex({
          ...BundleSample,
          entry: [{ resource: patient }],
        });

        expect(index.hasDuplicateIds).toBeUndefined();
        expect(getResourceById(index, "Patient", id)).toBe(patient);
      },
    );
    it("Returns a valid FhirIndex", () => {
      const actual = getFhirIndex(BundleSample);

      expect(actual).toEqual(fhirIndexBundleSample);
    });
    it("Returns an empty FhirIndex when a bundle has no resources", () => {
      const bundleEmpty = {} as unknown as Bundle;
      const actual = getFhirIndex(bundleEmpty);
      const expected = {
        fhirIndexByType: {},
        fhirIndexByTypeAndId: {},
      };
      expect(actual).toEqual(expected);
    });
    it("Does not index resources with no id", () => {
      const resourceNoId = {
        fullUrl: "urn:uuid:",
        resource: {
          resourceType: "Observation",
          id: "",
        },
      };
      const bundleWithResourceNoId = {
        ...BundleSample,
        entry: [...(BundleSample.entry ?? []), resourceNoId],
      } as Bundle;

      const actual = getFhirIndex(bundleWithResourceNoId);
      expect(actual).toEqual(fhirIndexBundleSample);
    });
    it("Does not index resources with no resourceType", () => {
      // Note: this should not be possible. Adding test for safeguarding anyways
      const resourceNoType = {
        fullUrl: "urn:uuid:4",
        resource: {
          resourceType: "",
          id: "4",
        },
      };
      const bundleWithResourceNoType = {
        ...BundleSample,
        entry: [...(BundleSample.entry ?? []), resourceNoType],
      } as Bundle;

      const actual = getFhirIndex(bundleWithResourceNoType);
      expect(actual).toEqual(fhirIndexBundleSample);
    });
  });
  describe("getResourcesByType Tests", () => {
    it("Returns all resources of a specified type", () => {
      const actual = getResourcesByType<Observation>(
        fhirIndexBundleSample,
        "Observation",
      );
      expect(actual.length).toEqual(2);
      expect(actual).toEqual([resource2.resource, resource3.resource]);
    });
    it("Returns an empty array when no resources exist of specified type", () => {
      const actual = getResourcesByType<Patient>(
        fhirIndexBundleSample,
        "Patient",
      );
      expect(actual).toEqual([]);
    });
    it("Returns an empty array when FHIR index is empty", () => {
      const fhirIndexEmpty: FhirIndex = {
        fhirIndexByType: {},
        fhirIndexByTypeAndId: {},
      };
      const actual = getResourcesByType<Patient>(fhirIndexEmpty, "Patient");
      expect(actual).toEqual([]);
    });
  });
  describe("getOneResourceByType Tests", () => {
    it("Returns a single resource of a specified type", () => {
      const actual = getOneResourceByType<Composition>(
        fhirIndexBundleSample,
        "Composition",
      );
      expect(actual).toEqual(resource1.resource);
    });
    it("Returns undefined when no resources exist of specified type", () => {
      const actual = getOneResourceByType<Patient>(
        fhirIndexBundleSample,
        "Patient",
      );
      expect(actual).toEqual(undefined);
    });
    it("Errors when there is more than one resource of a specific type", () => {
      expect(() =>
        getOneResourceByType<Observation>(fhirIndexBundleSample, "Observation"),
      ).toThrow(Error);
    });
  });
  describe("getResourceById Tests", () => {
    it("does not resolve inherited object properties as resources", () => {
      expect(
        getResourceById(fhirIndexBundleSample, "Observation", "toString"),
      ).toBeUndefined();
      expect(
        getResourceById(fhirIndexBundleSample, "constructor" as "Patient", "1"),
      ).toBeUndefined();
    });
    it("Returns resource with specified ID", () => {
      const actual = getResourceById<Composition>(
        fhirIndexBundleSample,
        "Composition",
        "1",
      );
      expect(actual).toEqual(resource1.resource);
    });
    it("Returns undefined when no resource exists with spcified ID", () => {
      const actual = getResourceById<Observation>(
        fhirIndexBundleSample,
        "Observation",
        "4",
      );
      expect(actual).toEqual(undefined);
    });
    it("Returns undefined if resource exists with specified ID BUT has the wrong resource Type", () => {
      const actual = getResourceById<Composition>(
        fhirIndexBundleSample,
        "Composition",
        "2",
      );
      expect(actual).toEqual(undefined);
    });
    it("Returns undefined if when FHIR index is empty", () => {
      const fhirIndexEmpty: FhirIndex = {
        fhirIndexByType: {},
        fhirIndexByTypeAndId: {},
      };
      const actual = getResourceById<Patient>(fhirIndexEmpty, "Patient", "1");
      expect(actual).toEqual(undefined);
    });
  });
});
