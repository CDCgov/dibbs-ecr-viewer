import { render } from "@testing-library/react";
import { Bundle } from "fhir/r4";

import BundlePatient from "../../../../../../test-data/fhir/BundlePatient.json";
import BundleWithTravelHistory from "../../../../../../test-data/fhir/BundleTravelHistory.json";
import {
  evaluateTravelHistoryTable,
  returnDisabilityStatusTable,
} from "@/app/services/socialHistoryService";

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

describe("Disabiity Status", () => {
  it("should display a table ", () => {
    const { container } = render(
      returnDisabilityStatusTable(BundlePatient as unknown as Bundle),
    );
    // TODO: Remove this once #595 is merged
    // Don't want IDs to dynamically update in this test
    const cleanedContainer = container.innerHTML
      .replace(/id="[^"]*"/g, 'id="id-tooltip"')
      .replace(
        /aria-describedby="[^"]*"/g,
        'aria-describedby="aria-desc-tooltip"',
      );
    expect(cleanedContainer).toMatchSnapshot();
  });
  it("should display nothing when no travel history is available", () => {
    expect(returnDisabilityStatusTable({} as Bundle)).toBeUndefined();
  });
});
