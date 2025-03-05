import "@testing-library/jest-dom";
import fhirPathMappings from "@/app/utils/evaluate/fhir-paths";

describe("fhirPath", () => {
  it("returns the yaml config", () => {
    expect(Object.keys(fhirPathMappings).length).toBeGreaterThan(3);
    expect(fhirPathMappings.patientNameList).toBe(
      "Bundle.entry.resource.where(resourceType = 'Patient').name",
    );
  });
});
