import React from "react";

import { render, screen } from "@testing-library/react";
import { Bundle } from "fhir/r4";
import { axe } from "jest-axe";

import BundleCareTeam from "@/../../../test-data/fhir/BundleCareTeam.json";
import BundleWithMiscNotes from "@/../../../test-data/fhir/BundleMiscNotes.json";
import * as _BundleWithPatient from "@/../../../test-data/fhir/BundlePatient.json";
import BundleWithPendingResultsOnly from "@/../../../test-data/fhir/BundlePendingResultsOnly.json";
import BundleWithPlannedMedsOnly from "@/../../../test-data/fhir/BundlePlannedMedsOnly.json";
import BundleWithScheduledApptsOnly from "@/../../../test-data/fhir/BundleScheduledApptsOnly.json";
import { DataDisplay } from "@/app/view-data/components/DataDisplay";
import { EcrDocument } from "@/app/view-data/components/EcrDocument";
import { getEcrDocumentAccordionItems } from "@/app/view-data/components/EcrDocument/accordion-items";
import {
  evaluateClinicalData,
  returnCareTeamTable,
} from "@/app/view-data/components/EcrDocument/clinical-data";

const BundleWithPatient = _BundleWithPatient as Bundle;

describe("Snapshot test for eCR Document", () => {
  it("Given no data, info message for empty sections should appear", async () => {
    const bundleEmpty: Bundle = {
      resourceType: "Bundle",
      type: "batch",
      entry: [],
    };

    const items = getEcrDocumentAccordionItems(bundleEmpty);

    const { container } = render(<EcrDocument initialAccordionItems={items} />);

    expect(await axe(container)).toHaveNoViolations();
    container.querySelectorAll("[id], [aria-describedby]").forEach((el) => {
      el.removeAttribute("id");
      el.removeAttribute("aria-describedby");
    });

    // This is an arbitrarily chosen test ID we expect one of the rendered accordion items to have.
    // There is nothing significant about "encounter-info_2" in particular.
    expect(
      screen.getByTestId("accordionButton_encounter-info_2"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("accordionItem_encounter-info_2"),
    ).toBeInTheDocument();

    expect(container).toMatchSnapshot();

    expect(
      screen.getByText("No patient information was found in this eCR."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No encounter information was found in this eCR."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No clinical information was found in this eCR."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No lab information was found in this eCR."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No eCR metadata was found in this eCR."),
    ).toBeInTheDocument();
  });

  describe("Evaluate Clinical Info", () => {
    it("Should return notes", () => {
      const actual = evaluateClinicalData(
        BundleWithMiscNotes as unknown as Bundle,
      );
      render(actual.clinicalNotes.availableData[0].value as React.JSX.Element);
      expect(actual.clinicalNotes.availableData[0].title).toEqual(
        "Miscellaneous Notes",
      );
      expect(screen.getByText("Active Problems")).toBeInTheDocument();
      expect(actual.clinicalNotes.unavailableData).toBeEmpty();
    });
    it("Should not include Treatment details if medications is not available", () => {
      const actual = evaluateClinicalData(
        BundleWithMiscNotes as unknown as Bundle,
      );
      expect(actual.treatmentData.availableData).toBeEmpty();
    });
    it("Should return Plan of Treatment when only pending results", () => {
      const actual = evaluateClinicalData(
        BundleWithPendingResultsOnly as unknown as Bundle,
      );
      expect(actual.treatmentData.availableData[0].title).toEqual(
        "Plan of Treatment",
      );
      const { container } = render(
        <DataDisplay item={actual.treatmentData.availableData[0]} />,
      );
      expect(container).toMatchSnapshot();
    });
    it("Should return Plan of Treatment when only scheduled appointments", () => {
      const actual = evaluateClinicalData(
        BundleWithScheduledApptsOnly as unknown as Bundle,
      );
      expect(actual.treatmentData.availableData[0].title).toEqual(
        "Plan of Treatment",
      );
      const { container } = render(
        <DataDisplay item={actual.treatmentData.availableData[0]} />,
      );
      expect(container).toMatchSnapshot();
    });
    it("Should return Plan of Treatment when only ordered meds", () => {
      const actual = evaluateClinicalData(
        BundleWithPlannedMedsOnly as unknown as Bundle,
      );
      expect(actual.treatmentData.availableData[0].title).toEqual(
        "Plan of Treatment",
      );
      const { container } = render(
        <DataDisplay item={actual.treatmentData.availableData[0]} />,
      );
      expect(container).toMatchSnapshot();
    });
  });

  describe("Evaluate Care Team Table", () => {
    it("should evaluate care team table results", () => {
      const actual: React.JSX.Element = returnCareTeamTable(
        BundleCareTeam as unknown as Bundle,
      ) as React.JSX.Element;

      render(actual);

      expect(screen.getByText("Dr Toob Nix SR")).toBeInTheDocument();
      expect(screen.getByText("family")).toBeInTheDocument();
      expect(
        screen.getByText("Start: 11/16/1884 End: 05/21/1896"),
      ).toBeInTheDocument();
    });

    it("the table should not appear when there are no results", () => {
      const actual = returnCareTeamTable(
        BundleWithPatient as unknown as Bundle,
      );
      expect(actual).toBeUndefined();
    });
  });
});
