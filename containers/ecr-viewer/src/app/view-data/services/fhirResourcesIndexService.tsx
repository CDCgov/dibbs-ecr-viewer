import { Bundle, Resource } from "fhir/r4";

type ResourceType = Resource["resourceType"];
type ResourceWithType<K extends ResourceType> = Resource & { resourceType: K };

export type FhirIndexByType = {
  [K in ResourceType]?: ResourceWithType<K>[];
};

export type FhirIndexByTypeAndId = {
  [K in ResourceType]?: Record<string, ResourceWithType<K>>;
};

export type FhirIndexByReference = Record<string, Resource>;

export interface FhirIndex {
  fhirIndexByType: FhirIndexByType;
  fhirIndexByTypeAndId: FhirIndexByTypeAndId;
  /**
   * Resources keyed by the exact references that can address them. This
   * includes Bundle.entry.fullUrl and ResourceType/id when an id is present.
   * Optional so callers with a hand-built/legacy index can still use the ID
   * lookup fallback.
   */
  fhirIndexByReference?: FhirIndexByReference;
}

const URN_UUID_PREFIX = "urn:uuid:";
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
 * Returns the resource type declared by a relative FHIR reference. Absolute
 * references and URNs do not declare a resource type and return undefined.
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
 * 2. `fhirIndexByTypeAndId` – a map of resources keyed by `resourceType` and then by `id`.
 * 3. `fhirIndexByReference` – a map keyed by exact fullUrl and ResourceType/id references.
 *
 * @param fhirBundle - FHIR bundle
 * @returns A `FhirIndex` object containing:
 *   - `fhirIndexByType`: FHIR resources grouped by type as arrays.
 *   - `fhirIndexByTypeAndId`: FHIR resources grouped by type and ID for fast lookup.
 *   - `fhirIndexByReference`: FHIR resources keyed by exact references.
 * The indexes contain empty arrays/objects when no matching resources exist.
 */
export const getFhirIndex = (fhirBundle: Bundle): FhirIndex => {
  const fhirIndexByType: FhirIndexByType = {};
  const fhirIndexByTypeAndId: FhirIndexByTypeAndId = {};
  const fhirIndexByReference: FhirIndexByReference = {};

  fhirBundle.entry?.forEach((entry) => {
    const resource = entry.resource;
    const resourceType = resource?.resourceType;
    const resourceId = resource?.id;

    if (!resourceType) return;

    // Resource.id is optional, so indexing by type must not depend on it.
    fhirIndexByType[resourceType] ??= [];
    fhirIndexByType[resourceType].push(resource);

    if (entry.fullUrl) {
      fhirIndexByReference[entry.fullUrl] = resource;
    }

    if (resourceId) {
      fhirIndexByTypeAndId[resourceType] ??= {};
      fhirIndexByTypeAndId[resourceType][resourceId] = resource;

      fhirIndexByReference[`${resourceType}/${resourceId}`] = resource;
    }
  });

  return {
    fhirIndexByType,
    fhirIndexByTypeAndId,
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
 * Returns a FHIR resource by ID and checks its resource type. If no logical ID
 * match exists, a fullUrl reference (including a `urn:uuid:` plus the ID) is
 * used as a fallback.
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
  const resourceById = fhirIndex.fhirIndexByTypeAndId[type]?.[id];
  if (resourceById) return resourceById as T;

  const referenceCandidates = [id, `${type}/${id}`];
  if (!id.startsWith(URN_UUID_PREFIX)) {
    referenceCandidates.push(`${URN_UUID_PREFIX}${id}`);
  }

  for (const reference of referenceCandidates) {
    const resource = fhirIndex.fhirIndexByReference?.[reference];
    if (resource?.resourceType === type) return resource as T;
  }

  return undefined;
}

/**
 * Resolves either an exact Bundle.entry.fullUrl (including urn:uuid values) or
 * a relative ResourceType/id reference from a FHIR index.
 *
 * @param fhirIndex - FHIR resources indexed by type, ID, and reference.
 * @param reference - Exact fullUrl or relative FHIR reference.
 * @returns The referenced resource, or undefined when no target exists.
 */
export function getResourceByReference<T extends Resource>(
  fhirIndex: FhirIndex,
  reference: string,
): T | undefined {
  const resourceByExactReference = fhirIndex.fhirIndexByReference?.[reference];
  if (resourceByExactReference) return resourceByExactReference as T;

  const relativeReference = parseRelativeReference(reference);
  if (!relativeReference) return undefined;

  return getResourceById<T>(
    fhirIndex,
    relativeReference.resourceType as T["resourceType"],
    relativeReference.id,
  );
}
