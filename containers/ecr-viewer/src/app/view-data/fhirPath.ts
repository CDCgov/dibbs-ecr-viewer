// @ts-expect-error
import fhirBundleImport from "./fhirPath.yaml";

export type PathMappings = { [key: string]: string };

export default fhirBundleImport as PathMappings;
