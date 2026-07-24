import React from "react";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Bundle, DiagnosticReport } from "fhir/r4";

import _BundleLab from "../../../../../../../test-data/fhir/BundleLab.json";
import _BundleLabNoLabIds from "../../../../../../../test-data/fhir/BundleLabNoLabIds.json";
import { LabInfo, LabNavItem } from "@/app/view-data/components/LabInfo";
import {
  evaluateLabInfoData,
  LabReportElementData,
} from "@/app/view-data/services/labsService";
import {
  getFhirIndex,
  getResourcesByType,
} from "@/app/view-data/services/fhirResourcesIndexService";

const BundleLab = _BundleLab as unknown as Bundle;
const fhirIndexBundleLab = getFhirIndex(BundleLab);
const BundleLabNoLabIds = _BundleLabNoLabIds as unknown as Bundle;
const fhirIndexBundleLabNoLabIds = getFhirIndex(BundleLabNoLabIds);

describe("LabInfo", () => {
  describe("when labResults is LabReportElementData[]", () => {
    let labInfoJsx: React.ReactElement;
    beforeAll(() => {
      const diagnosticReports = getResourcesByType<DiagnosticReport>(
        fhirIndexBundleLab,
        "DiagnosticReport",
      );
      const labInfoOrg = evaluateLabInfoData(
        fhirIndexBundleLab,
        diagnosticReports,
      ) as LabReportElementData[];

      // Empty out one of the lab names for testing
      labInfoOrg[0].organizationDisplayDataProps[0].value = "";

      const subNavLabs = labInfoOrg.map(({ subNavMetadata }) => {
        return {
          title: subNavMetadata.title,
          id: subNavMetadata.id,
        };
      }) as LabNavItem[];

      labInfoJsx = <LabInfo labResults={labInfoOrg} />;
    });
    it("all should be collapsed by default", () => {
      render(labInfoJsx);

      screen
        .getAllByTestId("accordionButton", { exact: false })
        .forEach((button) => {
          expect(button).toHaveAttribute("aria-expanded", "false");
        });
      screen
        .getAllByTestId("accordionItem", { exact: false })
        .forEach((accordion) => {
          expect(accordion).not.toBeVisible();
        });
    });
    it("should expand all labs when collapse button is clicked", async () => {
      const user = userEvent.setup();
      render(labInfoJsx);
      const expandButtons = screen.getAllByText("Expand all labs");
      for (const button of expandButtons) {
        await user.click(button);
      }
      screen
        .getAllByTestId("accordionButton", { exact: false })
        .forEach((button) => {
          expect(button).toHaveAttribute("aria-expanded", "true");
        });
      screen
        .getAllByTestId("accordionItem", { exact: false })
        .forEach((accordion) => {
          expect(accordion).toBeVisible();
        });
    });
    it("should hide all labs when collapse button is clicked", async () => {
      const user = userEvent.setup();
      render(labInfoJsx);
      const expandButtons = screen.getAllByText("Expand all labs");
      for (const button of expandButtons) {
        await user.click(button);
      }
      screen
        .getAllByTestId("accordionButton", { exact: false })
        .forEach((button) => {
          expect(button).toHaveAttribute("aria-expanded", "true");
        });
      screen
        .getAllByTestId("accordionItem", { exact: false })
        .forEach((accordion) => {
          expect(accordion).toBeVisible();
        });

      const collapseButtons = screen.getAllByText("Collapse all labs");
      for (const button of collapseButtons) {
        await user.click(button);
      }
      screen
        .getAllByTestId("accordionButton", { exact: false })
        .forEach((button) => {
          expect(button).toHaveAttribute("aria-expanded", "false");
        });
      screen
        .getAllByTestId("accordionItem", { exact: false })
        .forEach((accordion) => {
          expect(accordion).not.toBeVisible();
        });
    });
    it("should match snapshot test", () => {
      const { container } = render(labInfoJsx);
      expect(container).toMatchSnapshot();
    });
  });

  describe("when labResults is DisplayDataProps[]", () => {
    let labInfo: LabReportElementData[];
    let subNavLabs: LabNavItem[];
    beforeAll(() => {
      const diagnosticReports = getResourcesByType<DiagnosticReport>(
        fhirIndexBundleLabNoLabIds,
        "DiagnosticReport",
      );
      labInfo = evaluateLabInfoData(
        fhirIndexBundleLabNoLabIds,
        diagnosticReports,
      );

      subNavLabs = labInfo.map(({ subNavMetadata }) => {
        return {
          title: subNavMetadata.title,
          id: subNavMetadata.id,
        };
      }) as LabNavItem[];
    });
    it("should be collapsed by default", () => {
      render(<LabInfo labResults={labInfo} />);
      screen
        .getAllByTestId("accordionButton", { exact: false })
        .forEach((button) => {
          expect(button).toHaveAttribute("aria-expanded", "false");
        });
      screen
        .getAllByTestId("accordionItem", { exact: false })
        .forEach((accordion) => {
          expect(accordion).not.toBeVisible();
        });
    });

    it("should not render any results if no table data is present", () => {
      render(<LabInfo labResults={[]} />);
      expect(screen.queryByText("Lab Results")).not.toBeInTheDocument();
      expect(screen.queryByTestId("table")).not.toBeInTheDocument();
    });

    it("should match snapshot test", () => {
      const { container } = render(<LabInfo labResults={labInfo} />);
      expect(container).toMatchSnapshot();
    });
  });
});
