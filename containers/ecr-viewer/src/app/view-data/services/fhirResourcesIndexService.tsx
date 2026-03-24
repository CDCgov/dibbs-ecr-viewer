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
 * Extracts all lab `Observation` resources from a given FHIR bundle across all diagnostic reports.
 * @param fhirBundle - The FHIR bundle containing related resources for the lab report.
 * @returns An object of `Observation` resources with the observation `id` (string) as the key.
 * If no matching observations are found, an empty object is returned.
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
 * Returns array of all resources of a specific type.
 */
// TODO ANGELA: ADD TESTS
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
 */
// TODO ANGELA: ADD TESTS. Returns undefined if the ID doesn’t exist. Returns undefined if the ID exists but is the wrong resourceType.
export function getResourceById<T extends Resource>(
  fhirIndex: FhirIndex,
  type: T["resourceType"],
  id: string,
): T | undefined {
  const resource = fhirIndex.fhirIndexByTypeAndId[type]?.[id];
  if (resource?.resourceType === type) return resource as T;
  return undefined;
}
