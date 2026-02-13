/**
 * Get ECR ID from FHIR bundle Identifier. Pulls Root and Extension ID values from the FHIR Bundle Identifier and passes
 * them to resolveEcrId to return a proper ID string.
 * @param identifier Identifier from FHIR Bundle
 * @returns ECR ID string
 */
export const getEcrIdFromIdentifier = (
  identifier: fhir4.Identifier,
): string => {
  let root = "";
  let extension = "";

  if (identifier.system === "urn:ietf:rfc:3986") {
    root = identifier.value ?? "";
  } else if (
    identifier.system === "http://terminology.hl7.org/CodeSystem/v3-NullFlavor"
  ) {
    extension = identifier.value ?? "";
  } else {
    root = identifier.system ?? "";
    extension = identifier.value ?? "";
  }

  return resolveEcrId(root, extension);
};

/**
 * Function to resolve proper ECR ID from root and extension values
 * @param root Value originating from the /ClinicalDocument/id/@root path in the original CDA XML
 * @param extension Value from the /ClinicalDocument/id/@extension path in the original CDA XML
 * @returns The ECR ID string composed of root and extension values if present, otherwise just root or
 * extension if only one is present
 */
export const resolveEcrId = (root: string, extension: string): string => {
  if (!root && !extension) {
    throw new Error("Missing ECR identifier root and extension.");
  }

  // trim off prefix
  const oidPrefix = "urn:oid:";
  const uuidPrefix = "urn:uuid:";
  if (root.includes(oidPrefix)) {
    root = root.slice(oidPrefix.length);
  } else if (root.includes(uuidPrefix)) {
    root = root.slice(uuidPrefix.length)
  }

  if (root && extension) {
    return root + "^" + extension;
  } else if (root) {
    return root;
  }

  return extension;
};
