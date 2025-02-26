// @ts-expect-error
import fhirPathImport from "./fhirPath.yaml";

export type PathMappings = { [key: string]: string };

export default fhirPathImport as PathMappings;
