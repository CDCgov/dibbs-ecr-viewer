import "server-only"; // fhirpath should only be used on the server

import {
  Bundle,
  CodeableConcept,
  Coding,
  Element,
  Quantity,
  Resource,
} from "fhir/r4";
import {
  Context,
  evaluate as fhirPathEvaluate,
  Model,
  Path,
  UserInvocationTable,
} from "fhirpath";
import fhirpath_r4_model from "fhirpath/fhir-context/r4";

import fhirPathMappings from "@/app/data/fhirPath";
import { getHumanReadableCodeableConcept } from "@/app/services/evaluateFhirDataService";

// TODO: Follow up on FHIR/fhirpath typing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const evaluateCache: Map<string, any> = new Map();

/**
 * Evaluates a FHIRPath expression on the provided FHIR data.
 * @param fhirData - The FHIR data to evaluate the FHIRPath expression on.
 * @param path - The FHIRPath expression to evaluate.
 * @param [context] - Optional context object to provide additional data for evaluation.
 * @param [model] - Optional model object to provide additional data for evaluation.
 * @param [options] - Optional options object for additional configuration.
 * @param [options.resolveInternalTypes] - Whether to resolve internal types in the evaluation.
 * @param [options.traceFn] - Optional trace function for logging evaluation traces.
 * @param [options.userInvocationTable] - Optional table for tracking user invocations.
 * @returns - An array containing the result of the evaluation.
 */
export const evaluate = (
  // TODO: Follow up on FHIR/fhirpath typing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fhirData: any,
  path: string | Path,
  context?: Context,
  model?: Model,
  options?: {
    resolveInternalTypes?: boolean;
    // TODO: Follow up on FHIR/fhirpath typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    traceFn?: (value: any, label: string) => void;
    userInvocationTable?: UserInvocationTable;
  },
  // TODO: Follow up on FHIR/fhirpath typing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any[] => {
  // Since the bundle does not have an ID, prefer to just use "bundle" instead
  const fhirDataIdentifier: string =
    (fhirData?.resourceType === "Bundle"
      ? fhirData?.entry?.[0]?.fullUrl
      : fhirData?.id) ?? JSON.stringify(fhirData);
  const key =
    fhirDataIdentifier + JSON.stringify(context) + JSON.stringify(path);
  if (!evaluateCache.has(key)) {
    evaluateCache.set(
      key,
      fhirPathEvaluate(fhirData, path, context, model, options),
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

/**
 * Evaluates the FHIR path and returns the appropriate string value. Supports choice elements (e.g. using `.value` in path to get valueString or valueCoding)
 * @param entry - The FHIR resource to evaluate.
 * @param path - The path within the resource to extract the value from.
 * @returns - The evaluated value as a string.
 */
export const evaluateValue = (
  entry: Element | Element[],
  path: string | Path,
): string => {
  const originalValue = evaluate(entry, path, undefined, fhirpath_r4_model)[0];

  let value = "";
  const originalValuePath = originalValue?.__path__?.path;
  if (
    typeof originalValue === "string" ||
    typeof originalValue === "number" ||
    typeof originalValue === "boolean"
  ) {
    value = originalValue.toString();
  } else if (originalValuePath === "Quantity") {
    const data: Quantity = originalValue;
    let unit = data.unit;
    const firstLetterRegex = /^[a-z]/i;
    if (unit?.match(firstLetterRegex)) {
      unit = " " + unit;
    }
    value = `${data.value ?? ""}${unit ?? ""}`;
  } else if (originalValuePath === "CodeableConcept") {
    const data: CodeableConcept = originalValue;
    value = getHumanReadableCodeableConcept(data) ?? "";
  } else if (originalValuePath === "Coding") {
    const data: Coding = originalValue;
    value = data?.display || data?.code || "";
  } else if (typeof originalValue === "object") {
    console.log(`Not implemented for ${originalValue.__path__}`);
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
  const result: Resource | undefined = evaluate(
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
