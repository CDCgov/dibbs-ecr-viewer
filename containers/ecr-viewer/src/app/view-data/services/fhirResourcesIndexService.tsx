import { Bundle, Resource } from "fhir/r4";

export type ResourceType = Resource["resourceType"];
export type FhirResourceByTypeIndex = {
  // This says: If the key is 'Patient', the value is Record<string, Patient>
  [K in ResourceType]?: Record<string, Extract<Resource, { resourceType: K }>>;
};

export interface FhirResourceByIdIndex {
  [id: string]: Resource
}

export interface FhirIndex {
  fhirResourcesByType: FhirResourceByTypeIndex;
  fhirResourcesById: FhirResourceByIdIndex;
}

/**
 * Extracts all lab `Observation` resources from a given FHIR bundle across all diagnostic reports.
 * @param fhirBundle - The FHIR bundle containing related resources for the lab report.
 * @returns An object of `Observation` resources with the observation `id` (string) as the key.
 * If no matching observations are found, an empty object is returned.
 */
export const getFhirIndex = (fhirBundle: Bundle): FhirIndex => {
  const fhirResourcesByType: FhirResourceByTypeIndex = {};
  const fhirResourcesById: FhirResourceByIdIndex = {};

  fhirBundle.entry?.forEach((entry) => {
    const resource = entry.resource;
    const resourceType = resource?.resourceType;
    const resourceId = resource?.id;

    if (resourceType && resourceId) {
      fhirResourcesById[resourceId] = resource;

      fhirResourcesByType[resourceType] ??= {};
      fhirResourcesByType[resourceType][resourceId] = resource;
    }
  });

  return { fhirResourcesByType, fhirResourcesById };
};

/**
 * Grabs all resources of a specific type.
 */
export function getResourcesByType<T extends Resource>(
  fhirIndex: FhirIndex,
  type: T["resourceType"]
): T[] {
  const resourceMap = fhirIndex.fhirResourcesByType[type];
  
  if (!resourceMap) return [];

  // We cast to 'any' internally to satisfy the complex mapped type,
  // but the external return type is perfectly narrowed to T[]
  return Object.values(resourceMap ?? {}) as T[];
}