import { Bundle, Resource } from "fhir/r4";

type ResourceType = Resource["resourceType"];
type ResourceWithType<K extends ResourceType> = Resource & { resourceType: K };

export type FhirIndexByType = {
  [K in ResourceType]?: ResourceWithType<K>[];
};

export type FhirIndexByTypeAndId = {
  [K in ResourceType]?: Record<string, ResourceWithType<K>>;
};

export interface FhirIndex {
  fhirIndexByType: FhirIndexByType;
  fhirIndexByTypeAndId: FhirIndexByTypeAndId;
}

/**
 * Builds an index of FHIR resources from a given FHIR bundle.
 * NOTE: Index should only be accessed indirectly via helper functions below.
 *
 * Extracts all resources from a given FHIR bundle and organizes them into two maps:
 * 1. `fhirIndexByType` – an map of resources keyed by `resourceType` mapping to an array of all resources of that type.
 * 2. `fhirIndexByTypeAndId` – a map of resources keyed by `resourceType` and then by `id`.
 *
 * @param fhirBundle - FHIR bundle
 * @returns A `FhirIndex` object containing:
 *   - `fhirIndexByType`: FHIR resources grouped by type as arrays.
 *   - `fhirIndexByTypeAndId`: FHIR resources grouped by type and ID for fast lookup.
 * Both will return empty arrays/objects if no resources of a given type exist.
 */
export const getFhirIndex = (fhirBundle: Bundle): FhirIndex => {
  const fhirIndexByType: FhirIndexByType = {};
  const fhirIndexByTypeAndId: FhirIndexByTypeAndId = {};

  fhirBundle.entry?.forEach((entry) => {
    const resource = entry.resource;
    const resourceType = resource?.resourceType;
    const resourceId = resource?.id;

    if (resourceType && resourceId) {
      // by Type (array)
      fhirIndexByType[resourceType] ??= [];
      fhirIndexByType[resourceType].push(resource);

      // by Type and ID (map)
      fhirIndexByTypeAndId[resourceType] ??= {};
      fhirIndexByTypeAndId[resourceType][resourceId] = resource;
    }
  });

  return { fhirIndexByType, fhirIndexByTypeAndId };
};

/**
 * Returns array of all resources of a specific type (i.e. "Observation").
 *
 * @template T - The expected FHIR Resource type (e.g., Observation, Patient).
 * @param fhirIndex - FHIR resources indexed by type & by ID
 * @param type - The resourceType to retrieve (e.g., "Observation").
 *
 * @returns Array of FHIR resources of type `T`, or empty array if
 * no resources of specified type exist.
 */
export function getResourcesByType<T extends Resource>(
  fhirIndex: FhirIndex,
  type: T["resourceType"],
): T[] {
  const resourceMap = fhirIndex.fhirIndexByType[type];

  if (!resourceMap) return [];

  return resourceMap as T[];
}

/**
 * Returns FHIR resource by ID and check resource type.
 * Expects only one resource to be returned.
 * NOTE: should only be accessed by evaluateReference2
 *
 * @template T - The expected FHIR Resource type (e.g., Observation, Patient).
 * @param fhirIndex - FHIR resources indexed by type & by ID
 * @param type - The resourceType to retrieve (e.g., "Observation").
 * @param id - The unique identifier of the resource.
 *
 * @returns FHIR resource of type `T` if it exists and resourceType matches `type`
 * Returns undefined if no resource exists with given ID and resourceType
 */
export function getResourceById<T extends Resource>(
  fhirIndex: FhirIndex,
  type: T["resourceType"],
  id: string,
): T | undefined {
  const resource = fhirIndex.fhirIndexByTypeAndId[type]?.[id];
  return resource as T | undefined;
}
