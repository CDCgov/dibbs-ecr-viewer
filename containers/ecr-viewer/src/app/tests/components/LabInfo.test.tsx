import React from "react";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Bundle } from "fhir/r4";

import {
  evaluateLabInfoData,
  LabReportElementData,
} from "@/app/services/labsService";
import BundleLab from "@/app/tests/assets/BundleLab.json";
import BundleLabNoLabIds from "@/app/tests/assets/BundleLabNoLabIds.json";
import { evaluateAll } from "@/app/utils/evaluate";
import fhirPathMappings from "@/app/utils/evaluate/fhir-paths";
import LabInfo from "@/app/view-data/components/LabInfo";

describe("LabInfo", () => {
  describe("when labResults is LabReportElementData[]", () => {
    let labInfoJsx: React.ReactElement;
    beforeAll(() => {
      const labinfoOrg = evaluateLabInfoData(
        BundleLab as unknown as Bundle,
        evaluateAll(BundleLab as Bundle, fhirPathMappings.diagnosticReports),
      ) as LabReportElementData[];

      // Empty out one of the lab names for testing
      labinfoOrg[0].organizationDisplayDataProps[0].value = "";

      labInfoJsx = <LabInfo labResults={labinfoOrg} />;
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
    it("should be collapsed by default", () => {
      const labinfo = evaluateLabInfoData(
        BundleLabNoLabIds as unknown as Bundle,
        evaluateAll(
          BundleLabNoLabIds as Bundle,
          fhirPathMappings.diagnosticReports,
        ),
      );

      render(<LabInfo labResults={labinfo} />);
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
      render(<LabInfo labResults={[{}]} />);
      expect(screen.getByText("Lab Results")).toBeInTheDocument();
      expect(
        screen.queryByTestId("accordionButton_all-lab-results"),
      ).not.toBeInTheDocument();
      expect(screen.queryByTestId("table")).not.toBeInTheDocument();
    });

    it("should match snapshot test", () => {
      const labinfo = evaluateLabInfoData(
        BundleLabNoLabIds as unknown as Bundle,
        evaluateAll(
          BundleLabNoLabIds as Bundle,
          fhirPathMappings.diagnosticReports,
        ),
      );

      const { container } = render(<LabInfo labResults={labinfo} />);
      expect(container).toMatchSnapshot();
    });
  });
});
