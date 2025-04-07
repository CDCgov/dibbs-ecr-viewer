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
import { Context, evaluate as fhirPathEvaluate } from "fhirpath";
import fhirpath_r4_model from "fhirpath/fhir-context/r4";

import { formatCodeableConcept } from "@/app/services/formatService";

import fhirPathMappings, { PathTypes, ValueX, FhirPath } from "./fhir-paths";

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

interface NodeInfo {
  path: string;
  fhirNodeDataType: string;
}

const checkResult = <R>(results: R[], expectedType: string | undefined) => {
  // Nothing we know to check here
  if (expectedType === "unknown" || !expectedType) return;

  const result = results[0];
  const actualType = typeof result;
  if (actualType === "undefined") return;

  let valid = true;
  const extras: { path?: NodeInfo } = {};
  if (actualType === "object") {
    const nodeInfo = (result as { __path__: NodeInfo })?.__path__;
    if (expectedType === "ValueX") {
      valid = ["CodeableConcept", "Coding", "Quantity"].includes(
        nodeInfo.fhirNodeDataType,
      );
    } else if (
      expectedType === "Coding" &&
      nodeInfo.path === "Coding.entries.eRSDwarnings"
    ) {
      // TODO #461: Remove this hard coded corner case
    } else {
      valid =
        expectedType.toLowerCase() ===
        nodeInfo.path.toLowerCase().replace(".", "");
    }
    extras.path = nodeInfo;
  } else if (actualType !== expectedType && expectedType !== "ValueX") {
    valid = false;
  }
  if (!valid) {
    console.error({
      message: "Expected type did not match actual result type",
      result,
      expectedType,
      actualType,
      ...extras,
    });
  }
};

/**
 * Evaluates a FHIRPath expression on the provided FHIR data. This should only be used as an
 * escape hatch during testing when not using a `fhirPathmapping`.
 * @see {@link evaluateAll} for retrieving all results for a `FhirPath`
 * @see {@link evaluateOne} for retrieving a singleton result for a `FhirPath`
 * @see {@link evaluateValue} for retrieving a singleton result and formatting it as a string
 * @param fhirData - The FHIR data to evaluate the FHIRPath expression on.
 * @param path - The FHIRPath expression to evaluate.
 * @param expectedType - Optionally, the type of the expected result as a string.
 * @param [context] - Optional context object to provide additional data for evaluation.
 * @returns - An array containing the result of the evaluation.
 */
export const evaluateAllAndCheck = <Result>(
  fhirData: FhirData,
  path: string,
  expectedType: string,
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
    const result = fhirPathEvaluate(
      fhirData,
      path,
      context,
      fhirpath_r4_model,
    ) as Result[];
    checkResult(result, expectedType);
    evaluateCache.set(key, result);
  }
  return evaluateCache.get(key);
};

/**
 * Evaluates a FHIRPath expression on the provided FHIR data. This should only be used as an
 * escape hatch during testing when not using a `fhirPathmapping`.
 * @see {@link evaluateOne} for retrieving a singleton result for a `FhirPath`
 * @see {@link evaluateValue} for retrieving a singleton result and formatting it as a string
 * @param args - The same arguments as `evaluateAllAndCheck`.
 * @returns - An array containing the result of the evaluation.
 */
export const evaluateOneAndCheck = <Result>(
  ...args: Parameters<typeof evaluateAllAndCheck<Result>>
) => {
  const res = evaluateAllAndCheck<Result>(...args);
  if (res.length === 0) {
    return undefined;
  } else if (res.length > 1) {
    console.error(
      `Expected one result, but got ${res.length}. Args: ${JSON.stringify(
        args,
      )}`,
    );
  }

  return res[0];
};

/**
 * Reset the evaluate cache map
 */
export const clearEvaluateCache = () => {
  evaluateCache.clear();
};

/**
 * Evaluates a FhirPath on the provided FHIR data and returns the results as an
 * Array (may be empty). This function ensures the types are constrained at compile time and
 * checked at runtime (as a logged error, not a throwing one).
 * @see {@link evaluateOne} if you expect only one result.
 * @param fhirData - The FHIR data to evaluate the FHIRPath expression on.
 * @param fhirPath - The FhirPath describing the FHIRPath expression to evaluate.
 * @param [context] - Optional context object to provide additional data for evaluation.
 * @returns - An array containing the result of the evaluation.
 */
export const evaluateAll = <K extends keyof PathTypes>(
  fhirData: FhirData,
  fhirPath: FhirPath<K>,
  context?: Context,
) => {
  return evaluateAllAndCheck<PathTypes[K]>(
    fhirData,
    fhirPath.path,
    fhirPath.type,
    context,
  );
};

/**
 * Evaluates a FHIRPath on the provided FHIR data and returns the single
 * expected item, or undefined if not available. This function ensures the types
 * are constrained at compile time and checked at runtime (as a logged error,
 * not a throwing one). Additionally, if more than one result is evaluated,
 * the first will be returned and an error logged with info on the evaluation
 * and number of results.
 * @see {@link evaluateAll} if you expect more than one result.
 * @see {@link evaluateValue} if your path ends in `.value` or it is a simple type and
 * you want to ensure a string is always returned.
 * @param fhirData - The FHIR data to evaluate the FHIRPath expression on.
 * @param fhirPath - The FhirPath describing the FHIRPath expression to evaluate.
 * @param [context] - Optional context object to provide additional data for evaluation.
 * @returns - An array containing the result of the evaluation.
 */
export const evaluateOne = <K extends keyof PathTypes>(
  fhirData: FhirData,
  fhirPath: FhirPath<K>,
  context?: Context,
) => {
  return evaluateOneAndCheck<PathTypes[K]>(
    fhirData,
    fhirPath.path,
    fhirPath.type,
    context,
  );
};

// Map from computer to human readable units
const UNIT_MAP = new Map([
  ["[lb_av]", "lb"],
  ["[in_i]", "in"],
  ["[in_us]", "in"],
]);

/**
 * Evaluates the FHIR path and formats it as an appropriate string value (may be empty). Supports
 * choice elements (e.g. using `.value` in path to get valueString or valueCoding) or
 * elemnts of type string, number, boolean, Coding, CodeableConcept, or Quantity.
 *
 * Expects a single element to be returned from the path. If more than one is evaluated, the
 * first will be returned and an error will be logged to the console with information
 * on the evaluation.
 * @see {@link evaluateOne} if you want the structured underlying data in its original form
 * @param entry - The FHIR resource to evaluate.
 * @param path - The path within the resource to extract the value from.
 * @returns - The evaluated value as a string.
 */
export const evaluateValue = (
  entry: FhirData,
  path: string | FhirPath<string>,
): string => {
  const [fhirPath, type] =
    typeof path === "string" ? [path, "ValueX"] : [path.path, path.type];
  const originalValue =
    evaluateOneAndCheck<ValueX>(entry, fhirPath, type) || "";

  if (
    typeof originalValue === "string" ||
    typeof originalValue === "number" ||
    typeof originalValue === "boolean"
  ) {
    return originalValue.toString();
  }

  let value = "";
  // fhirpath injects some internal metadata we leverage here for the switch
  const originalValuePath = (originalValue as { __path__: NodeInfo })?.__path__
    ?.path;

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
    value = formatCodeableConcept(data) ?? "";
  } else if (originalValuePath === "Coding") {
    const data: Coding = originalValue;
    value = data?.display || data?.code || "";
  } else if (typeof originalValue === "object") {
    console.log(`Not implemented for ${originalValuePath}`);
  }

  return value.trim();
};

/**
 * Evaluates a reference in a FHIR bundle. The resulting type of the expected resource
 * must be provided as a type parameter. This will also be checked at runtime and an
 * error logged if it does not match.
 *
 * Expects a single element to be returned from the reference. If more than one is evaluated, the
 * first will be returned and an error will be logged to the console with information
 * on the evaluation.
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
  const result = evaluateOneAndCheck<T>(
    fhirBundle,
    fhirPathMappings.resolve.path,
    resourceType,
    {
      resourceType,
      id,
    },
  );

  if (result && result?.resourceType !== resourceType) {
    console.error(
      `Resource type mismatch: Expected ${resourceType}, but got ${result?.resourceType}`,
    );
  }

  return result;
};
