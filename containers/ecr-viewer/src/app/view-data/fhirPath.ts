import "server-only";

// @ts-expect-error
import fhirPathMappings from "./fhirPath.yaml";

export type PathMappings = { [key: string]: string };

export default fhirPathMappings as PathMappings;
