import { Bundle } from "fhir/r4";
import fhirPathMappings from "@/app/utils/evaluate/fhir-paths";
import { getFhirIndex } from "@/app/view-data/services/fhirResourcesIndexService";
import { evaluateAll } from "@/app/utils/evaluate";
import { returnProblemsTable } from "@/app/view-data/services/clinicalInfoService";
import BundleNoActiveProblems from "@/../../../test-data/fhir/BundleNoActiveProblems.json";

describe("Render Active Problem table", () => {
  it("should return empty if active problem name is undefined", () => {
    const fhirIndex = getFhirIndex(BundleNoActiveProblems as unknown as Bundle);
    const actual = returnProblemsTable(
      BundleNoActiveProblems as unknown as Bundle,
      fhirIndex,
      evaluateAll(
        BundleNoActiveProblems as unknown as Bundle,
        fhirPathMappings.activeProblems
      )
    );
    expect(actual).toBeUndefined();
  });
});
