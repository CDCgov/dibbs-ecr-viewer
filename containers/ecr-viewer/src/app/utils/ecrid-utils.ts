/**
 * Get ECR ID from Identifier object
 * @param identifier Identifier from FHIR Bundle
 * @returns ECR ID
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
 * @param root Value originating from the /ClinicalDocument/id/@root path - id.system in the FHIR Bundle
 * @param extension Value from the /ClinicalDocument/id/@extension path - id.value in the FHIR Bundle
 * @returns The ECR ID string composed of root and extenstion values if present
 */
export const resolveEcrId = (root: string, extension: string): string => {
  console.log("Root: ", root);
  console.log("Extension: ", extension);

  if (!root && !extension) {
    throw new Error("Missing ECR identifier root and extension.");
  }

  // trim off prefix
  const prefix = "urn:oid:";
  if (root.includes(prefix)) {
    root = root.slice(prefix.length);
  }

  if (root && extension) {
    return root + "^" + extension;
  } else if (root) {
    return root;
  }

  return extension;
};
