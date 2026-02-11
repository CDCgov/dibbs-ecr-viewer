import { resolveEcrId } from "@/app/utils/ecrid-utils";

describe("ECR id utils", () => {
  describe("getEcrIdFromIdentifier", () => {
    //it("should return root if only root has a valu");
  });

  describe("resolveEcrId", () => {
    it("should return the full id with both root and extension if present", () => {
      const root = "urn:oid:2.16.840.1.113883.9.9.9.9.9";
      const extension = "db734647-fc99-424c-a864-7e3cda82e703";

      const result = resolveEcrId(root, extension);
      const expectedEcrId =
        "2.16.840.1.113883.9.9.9.9.9^db734647-fc99-424c-a864-7e3cda82e703";
      expect(result).toBe(expectedEcrId);
    });

    it("should return only the root when extension is missing", () => {
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
