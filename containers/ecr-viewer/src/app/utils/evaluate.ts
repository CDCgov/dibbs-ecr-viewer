import {
  Context,
  evaluate as fhirPathEvaluate,
  Model,
  Path,
  UserInvocationTable,
} from "fhirpath";

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
  fhirData: any,
  path: string | Path,
  context?: Context,
  model?: Model,
  options?: {
    resolveInternalTypes?: boolean;
    traceFn?: (value: any, label: string) => void;
    userInvocationTable?: UserInvocationTable;
  },
): any[] => {
  // Since the bundle does not have an ID, prefer to just use "bundle" instead
  let fhirDataIdentifier: string =
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
