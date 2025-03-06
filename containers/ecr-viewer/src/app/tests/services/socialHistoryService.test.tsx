import { render } from "@testing-library/react";
import { Bundle } from "fhir/r4";

import BundleWithTravelHistory from "../../../../../../test-data/fhir/BundleTravelHistory.json";
import { evaluateTravelHistoryTable } from "@/app/services/socialHistoryService";

describe("Travel History", () => {
  it("should display a table ", () => {
    const { container } = render(
      evaluateTravelHistoryTable(BundleWithTravelHistory as unknown as Bundle),
    );
    expect(container).toMatchSnapshot();
  });
  it("should display nothing when no travel history is available", () => {
    expect(evaluateTravelHistoryTable({} as Bundle)).toBeUndefined();
  });
});
