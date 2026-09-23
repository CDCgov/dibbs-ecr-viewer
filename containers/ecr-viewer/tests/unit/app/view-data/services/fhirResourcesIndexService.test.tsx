import { Bundle, Composition, Observation, Patient } from "fhir/r4";
import {
  FhirIndex,
  getFhirIndex,
  getOneResourceByType,
  getResourceById,
  getResourceByReference,
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
  fullUrl: "urn:uuid:observation-full-url",
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
  fhirIndexByReference: {
    "urn:uuid:1": resource1.resource,
    "Composition/1": resource1.resource,
    "urn:uuid:observation-full-url": resource2.resource,
    "Observation/2": resource2.resource,
    "urn:uuid:3": resource3.resource,
    "Observation/3": resource3.resource,
  },
};

describe("fhirResourcesIndexService Tests", () => {
  describe("getFhirIndex Tests", () => {
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
        fhirIndexByReference: {},
      };
      expect(actual).toEqual(expected);
    });
    it("Indexes a resource by type and fullUrl when it has no id", () => {
      const resourceNoId = {
        fullUrl: "urn:uuid:no-id",
        resource: {
          resourceType: "Observation",
        },
      };
      const bundleWithResourceNoId = {
        ...BundleSample,
        entry: [...(BundleSample.entry ?? []), resourceNoId],
      } as Bundle;

      const actual = getFhirIndex(bundleWithResourceNoId);
      expect(getResourcesByType<Observation>(actual, "Observation")).toEqual([
        resource2.resource,
        resource3.resource,
        resourceNoId.resource,
      ]);
      expect(actual.fhirIndexByReference?.["urn:uuid:no-id"]).toEqual(
        resourceNoId.resource,
      );
      expect(
        getResourceById<Observation>(actual, "Observation", "no-id"),
      ).toEqual(resourceNoId.resource);
    });
    it("Indexes a typed resource without an id or fullUrl by type only", () => {
      const resourceWithoutIdentity = {
        resource: {
          resourceType: "Observation",
        },
      };
      const bundle = {
        ...BundleSample,
        entry: [...(BundleSample.entry ?? []), resourceWithoutIdentity],
      } as Bundle;

      const actual = getFhirIndex(bundle);

      expect(getResourcesByType<Observation>(actual, "Observation")).toContain(
        resourceWithoutIdentity.resource,
      );
      expect(
        getResourceByReference<Observation>(actual, "urn:uuid:not-present"),
      ).toBeUndefined();
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
  describe("getResourceByReference Tests", () => {
    it("Returns a resource for an exact fullUrl reference", () => {
      const actual = getResourceByReference<Observation>(
        fhirIndexBundleSample,
        "urn:uuid:observation-full-url",
      );

      expect(actual).toEqual(resource2.resource);
    });
    it("Returns a resource for a relative reference", () => {
      const actual = getResourceByReference<Observation>(
        fhirIndexBundleSample,
        "Observation/2",
      );

      expect(actual).toEqual(resource2.resource);
    });
    it("Returns undefined for a dangling URN reference", () => {
      const actual = getResourceByReference<Observation>(
        fhirIndexBundleSample,
        "urn:uuid:not-present",
      );

      expect(actual).toBeUndefined();
    });
  });
});
