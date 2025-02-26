import "@testing-library/jest-dom";
import fhirPathMappings from "@/app/view-data/fhirPath";

// TODO PR: where should this file live?
describe("fhirPath", () => {
  it("returns the yaml config", () => {
    expect(Object.keys(fhirPathMappings).length).toBeGreaterThan(3);
    expect(fhirPathMappings["patientNameList"]).toBe(
      "Bundle.entry.resource.where(resourceType = 'Patient').name",
    );
  });
});
