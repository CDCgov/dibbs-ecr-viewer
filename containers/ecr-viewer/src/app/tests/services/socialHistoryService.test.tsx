import { render } from "@testing-library/react";
import { Bundle } from "fhir/r4";

import { loadYamlConfig } from "@/app/api/utils";
import { evaluateTravelHistoryTable } from "@/app/services/socialHistoryService";
import BundleWithTravelHistory from "@/app/tests/assets/BundleTravelHistory.json";
const mappings = loadYamlConfig();

describe("Travel History", () => {
  it("should display a table ", () => {
    const { container } = render(
      evaluateTravelHistoryTable(
        BundleWithTravelHistory as unknown as Bundle,
        mappings,
      ),
    );
    expect(container).toMatchSnapshot();
  });
  it("should display nothing when no travel history is available", () => {
    expect(evaluateTravelHistoryTable({} as Bundle, mappings)).toBeUndefined();
  });
});
