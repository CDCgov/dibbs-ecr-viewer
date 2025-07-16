import fhirPathMappings from "@/app/utils/evaluate/fhir-paths";

describe("fhir-path", () => {
  it("Path strings should be unique", () => {
    const pathCounter = new Map<string, number>();
    Object.keys(fhirPathMappings).forEach((key) => {
      const path = fhirPathMappings[key as keyof typeof fhirPathMappings].path;
      pathCounter.set(path, (pathCounter.get(path) || 0) + 1);
    });
    const duplicate = pathCounter.entries().find((x) => {
      if (x[1] > 1) {
        return x[0];
      }
    });
    if (duplicate) {
      throw Error(`Duplicate path found: ${duplicate}`);
    } else {
      expect(pathCounter.entries().every((x) => x[1] === 1)).toEqual(true);
    }
  });
});
