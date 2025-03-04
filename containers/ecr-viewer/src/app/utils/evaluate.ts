import "server-only"; // fhirpath should only be used on the server

import {
  Bundle,
  CodeableConcept,
  Coding,
  Element,
  FhirResource,
  Quantity,
  Resource,
} from "fhir/r4";
import { Context, evaluate as fhirPathEvaluate, Path } from "fhirpath";
import fhirpath_r4_model from "fhirpath/fhir-context/r4";

import fhirPathMappings, { PathTypes, ValueX } from "@/app/data/fhirPath";
import { getHumanReadableCodeableConcept } from "@/app/services/evaluateFhirDataService";

// TODO: Follow up on FHIR/fhirpath typing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const evaluateCache: Map<string, any> = new Map();

const isBundle = (e: Element | Element[] | FhirResource): e is Bundle => {
  if ("resourceType" in e) {
    return e?.resourceType === "Bundle";
  }

  return false;
};

type FhirData = Element | Element[] | FhirResource | undefined;

/**
 * Evaluates a FHIRPath expression on the provided FHIR data. This should only be used as an
 * escape hatch when not using a `fhirPathmapping`. See `evaluate` for the common usage.
 * @param fhirData - The FHIR data to evaluate the FHIRPath expression on.
 * @param path - The FHIRPath expression to evaluate.
 * @param [context] - Optional context object to provide additional data for evaluation.
 * @returns - An array containing the result of the evaluation.
 */
export const evaluateFor = <Result>(
  fhirData: FhirData,
  path: string | Path,
  context?: Context,
): Result[] => {
  if (!fhirData) return [];
  // Since the bundle does not have an ID, prefer to just use "bundle" instead
  const fhirDataIdentifier: string =
    (isBundle(fhirData)
      ? fhirData?.entry?.[0]?.fullUrl
      : !Array.isArray(fhirData) && fhirData?.id) || JSON.stringify(fhirData);
  const key =
    fhirDataIdentifier + JSON.stringify(context) + JSON.stringify(path);
  if (!evaluateCache.has(key)) {
    evaluateCache.set(
      key,
      fhirPathEvaluate(fhirData, path, context, fhirpath_r4_model),
    );
  }
  return evaluateCache.get(key);
};

/**
 * Reset the evaluate cache map
 */
export const clearEvaluateCache = () => {
  evaluateCache.clear();
};

export interface Mapping {
  [key: string]: string;
}

/**
 * Evaluates a FHIRPath expression on the provided FHIR data.
 * @param fhirData - The FHIR data to evaluate the FHIRPath expression on.
 * @param pathKey - The key of the FHIRPath expression to evaluate.
 * @param [context] - Optional context object to provide additional data for evaluation.
 * @returns - An array containing the result of the evaluation.
 */
export const evaluate = <K extends keyof PathTypes>(
  fhirData: FhirData,
  pathKey: K,
  context?: Context,
) => {
  return evaluateFor<PathTypes[K]>(
    fhirData,
    fhirPathMappings[pathKey],
    context,
  );
};

// Map from computer to human readable units
const UNIT_MAP = new Map([
  ["[lb_av]", "lb"],
  ["[in_i]", "in"],
]);

/**
 * Evaluates the FHIR path and returns the appropriate string value. Supports choice elements (e.g. using `.value` in path to get valueString or valueCoding)
 * @param entry - The FHIR resource to evaluate.
 * @param path - The path within the resource to extract the value from.
 * @returns - The evaluated value as a string.
 */
export const evaluateValue = (entry: FhirData, path: string): string => {
  const originalValue = evaluateFor<ValueX>(entry, path)[0];

  if (
    typeof originalValue === "string" ||
    typeof originalValue === "number" ||
    typeof originalValue === "boolean"
  ) {
    return originalValue.toString();
  }

  let value = "";
  // fhirpath injects some internal metadata we leverage here for the switch
  const originalValuePath = (originalValue as { __path__: { path: string } })
    ?.__path__?.path;

  if (originalValuePath === "Quantity") {
    const data: Quantity = originalValue;
    let unit = data.unit || "";
    unit = UNIT_MAP.get(unit) || unit;
    const firstLetterRegex = /^[a-z]/i;
    if (unit?.match(firstLetterRegex)) {
      unit = " " + unit;
    }
    value = `${data.value ?? ""}${unit}`;
  } else if (originalValuePath === "CodeableConcept") {
    const data: CodeableConcept = originalValue;
    value = getHumanReadableCodeableConcept(data) ?? "";
  } else if (originalValuePath === "Coding") {
    const data: Coding = originalValue;
    value = data?.display || data?.code || "";
  } else if (typeof originalValue === "object") {
    console.log(`Not implemented for ${originalValuePath}`);
  }

  return value.trim();
};

/**
 * Evaluates a reference in a FHIR bundle.
 * @param fhirBundle - The FHIR bundle containing resources.
 * @param ref - The reference string (e.g., "Patient/123").
 * @returns The FHIR Resource or undefined if not found.
 */
export const evaluateReference = <T extends Resource>(
  fhirBundle: Bundle,
  ref?: string,
): T | undefined => {
  if (!ref) return undefined;
  const [resourceType, id] = ref.split("/");
  const result: Resource | undefined = evaluateFor<Resource>(
    fhirBundle,
    fhirPathMappings.resolve,
    {
      resourceType,
      id,
    },
  )[0];

  if (!result) {
    return undefined;
  } else if (result?.resourceType !== resourceType) {
    console.error(
      `Resource type mismatch: Expected ${resourceType}, but got ${result?.resourceType}`,
    );
  }

  return result as T;
};
