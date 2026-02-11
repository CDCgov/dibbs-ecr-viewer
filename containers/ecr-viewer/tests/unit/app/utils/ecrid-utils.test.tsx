import { getEcrIdFromIdentifier, resolveEcrId } from "@/app/utils/ecrid-utils";

describe("ECR ID Utils", () => {
  describe("getEcrIdFromIdentifier", () => {
    it("should return root (from value with no prefix) if system is urn:ietf:rfc:3986", () => {
      const identifier = {
        system: "urn:ietf:rfc:3986",
        value: "urn:oid:2.16.840.1.113883.9.9.9.9.9",
      };

      const result = getEcrIdFromIdentifier(identifier);
      const expectedEcrId = "2.16.840.1.113883.9.9.9.9.9";
      expect(result).toBe(expectedEcrId);
    });

    it("should return extension (from value) if system is null flavor", () => {
      const identifier = {
        system: "http://terminology.hl7.org/CodeSystem/v3-NullFlavor",
        value: "db734647-fc99-424c-a864-7e3cda82e703",
      };

      const result = getEcrIdFromIdentifier(identifier);
      const expectedEcrId = "db734647-fc99-424c-a864-7e3cda82e703";
      expect(result).toBe(expectedEcrId);
    });

    it("should return the concatenated root (no prefix) and extension if both system and value are valid", () => {
      const identifier = {
        system: "urn:oid:2.16.840.1.113883.9.9.9.9.9",
        value: "db734647-fc99-424c-a864-7e3cda82e703",
      };

      const result = getEcrIdFromIdentifier(identifier);
      const expectedEcrId =
        "2.16.840.1.113883.9.9.9.9.9^db734647-fc99-424c-a864-7e3cda82e703";
      expect(result).toBe(expectedEcrId);
    });
  });

  describe("resolveEcrId", () => {
    it("should return the full id with both root (no prefix) and extension if present", () => {
      const root = "urn:oid:2.16.840.1.113883.9.9.9.9.9";
      const extension = "db734647-fc99-424c-a864-7e3cda82e703";

      const result = resolveEcrId(root, extension);
      const expectedEcrId =
        "2.16.840.1.113883.9.9.9.9.9^db734647-fc99-424c-a864-7e3cda82e703";
      expect(result).toBe(expectedEcrId);
    });

    it("should return only the root (no prefix) when extension is missing", () => {
      const root = "urn:oid:2.16.840.1.113883.9.9.9.9.9";
      const extension = "";

      const result = resolveEcrId(root, extension);
      const expectedEcrId = "2.16.840.1.113883.9.9.9.9.9";
      expect(result).toBe(expectedEcrId);
    });

    it("should throw an exception if both values are missing", () => {
      const root = "";
      const extension = "";

      expect(() => resolveEcrId(root, extension)).toThrow(Error);
    });

    it("should return the extension only if root is missing", () => {
      const root = "";
      const extension = "db734647-fc99-424c-a864-7e3cda82e703";

      const result = resolveEcrId(root, extension);
      expect(result).toBe(extension);
    });
  });
});
