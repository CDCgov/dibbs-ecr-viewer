import { render } from "@testing-library/react";
import { Bundle } from "fhir/r4";

import BundlePatient from "@/../../../test-data/fhir/BundlePatient.json";
import BundleWithTravelHistory from "@/../../../test-data/fhir/BundleTravelHistory.json";
import BundleWithSDOH from "@/../../../test-data/fhir/BundleSDOH.json";
import {
  evaluateTravelHistoryTable,
  returnDisabilityStatusTable,
  evaluateSocialDeterminantsOfHealth,
} from "@/app/view-data/services/socialHistoryService";

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

describe("Disability Status", () => {
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

describe("Social Determinants of Health", () => {
  it("should display sdoh data ", () => {
    const { container } = render(
      evaluateSocialDeterminantsOfHealth(BundleWithSDOH as unknown as Bundle),
    );
    expect(container).toMatchSnapshot();
  });

  it("should display nothing when no SDOH is available", () => {
    expect(evaluateSocialDeterminantsOfHealth({} as Bundle)).toBeUndefined();
  });
});
