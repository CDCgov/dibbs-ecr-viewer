import { Bundle, Resource } from "fhir/r4";

type ResourceType = Resource["resourceType"];
type ResourceWithType<K extends ResourceType> = Resource & { resourceType: K };

export type FhirIndexByType = {
  [K in ResourceType]?: ResourceWithType<K>[];
};

export type FhirIndexByReference = Record<string, Resource>;

export interface FhirIndex {
  fhirIndexByType: FhirIndexByType;
  /** Resources keyed by their canonical ResourceType/id reference. */
  fhirIndexByReference: FhirIndexByReference;
}

const RELATIVE_REFERENCE_PATTERN =
  /^([A-Z][A-Za-z0-9]*)\/([^/]+)(?:\/_history\/[^/]+)?$/;

const parseRelativeReference = (
  reference: string,
): { resourceType: ResourceType; id: string } | undefined => {
  const match = RELATIVE_REFERENCE_PATTERN.exec(reference);
  if (!match) return;

  return {
    resourceType: match[1] as ResourceType,
    id: match[2],
  };
};

/**
 * Returns the resource type declared by a relative FHIR reference.
 */
export const getReferenceResourceType = (
  reference: string,
): ResourceType | undefined => parseRelativeReference(reference)?.resourceType;

/**
 * Builds an index of FHIR resources from a given FHIR bundle.
 * NOTE: Index should only be accessed indirectly via helper functions below.
 *
 * Extracts all resources from a given FHIR bundle and organizes them into maps:
 * 1. `fhirIndexByType` – a map keyed by `resourceType`, with an array of all resources of that type.
 * 2. `fhirIndexByReference` – a map keyed by canonical ResourceType/id references.
 *
 * @param fhirBundle - FHIR bundle
 * @returns A `FhirIndex` object containing:
 *   - `fhirIndexByType`: FHIR resources grouped by type as arrays.
 *   - `fhirIndexByReference`: FHIR resources keyed by canonical references.
 * The indexes contain empty arrays/objects when no matching resources exist.
 */
export const getFhirIndex = (fhirBundle: Bundle): FhirIndex => {
  const fhirIndexByType: FhirIndexByType = {};
  const fhirIndexByReference: FhirIndexByReference = {};

  fhirBundle.entry?.forEach((entry) => {
    const resource = entry.resource;
    const resourceType = resource?.resourceType;
    const resourceId = resource?.id;

    if (!resourceType) return;
    if (!resourceId) {
      throw new Error(
        `Cannot index ${resourceType} resource without a canonical id.`,
      );
    }

    fhirIndexByType[resourceType] ??= [];
    fhirIndexByType[resourceType].push(resource);
    fhirIndexByReference[`${resourceType}/${resourceId}`] = resource;
  });

  return {
    fhirIndexByType,
    fhirIndexByReference,
  };
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
 * Returns a single resources of a specific type (i.e. "Patient").
 * Expects one result or none. If multiple results, will error.
 *
 * @template T - The expected FHIR Resource type (e.g. Patient).
 * @param fhirIndex - FHIR resources indexed by type & by ID
 * @param type - The resourceType to retrieve (e.g., "Patient").
 *
 * @returns A single FHIR resource of type `T`, or undefined if
 * no resources of specified type exist.
 * @error When multiple resources are found for the resource type
 */
export function getOneResourceByType<T extends Resource>(
  fhirIndex: FhirIndex,
  type: T["resourceType"],
): T | undefined {
  const resourceMap = fhirIndex.fhirIndexByType[type];

  if (resourceMap && resourceMap.length > 1) {
    throw new Error(
      `Expected one result of type ${type}, but got ${resourceMap.length}.`,
    );
  }

  if (!resourceMap || resourceMap.length === 0) {
    return undefined;
  }

  return resourceMap[0] as T;
}

/**
 * Returns a FHIR resource by ID and checks its resource type.
 * Expects only one resource to be returned.
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
  const resource = fhirIndex.fhirIndexByReference[`${type}/${id}`];
  return resource?.resourceType === type ? (resource as T) : undefined;
}

/**
 * Resolves a canonical or version-specific relative reference from a FHIR index.
 *
 * @param fhirIndex - FHIR resources indexed by type and canonical reference.
 * @param reference - Relative ResourceType/id reference, optionally version-specific.
 * @returns The referenced resource, or undefined when no target exists.
 */
export function getResourceByReference<T extends Resource>(
  fhirIndex: FhirIndex,
  reference: string,
): T | undefined {
  const resource = fhirIndex.fhirIndexByReference[reference];
  if (resource) return resource as T;

  // Version-specific references address the same logical resource indexed by
  // its canonical ResourceType/id reference.
  const relativeReference = parseRelativeReference(reference);
  if (!relativeReference) return undefined;

  return fhirIndex.fhirIndexByReference[
    `${relativeReference.resourceType}/${relativeReference.id}`
  ] as T | undefined;
}
