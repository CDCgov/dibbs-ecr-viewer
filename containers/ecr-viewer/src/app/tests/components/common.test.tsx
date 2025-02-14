import { loadYamlConfig } from "@/app/api/utils";
import {
  getMedicationDisplayName,
  returnHtmlTableContent,
} from "@/app/view-data/components/common";
import BundleLabNoLabIds from "../assets/BundleLabNoLabIds.json";
import { Bundle } from "fhir/r4";
import { render, screen } from "@testing-library/react";

const mappings = loadYamlConfig();
describe("common tests", () => {
  describe("getMedicationDisplayName", () => {
    it("handles undefined case", () => {
      expect(getMedicationDisplayName(undefined)).toBe(undefined);
    });

    it("handles empty case", () => {
      expect(getMedicationDisplayName({ coding: [] })).toBe(undefined);
    });

    it("handles single named case", () => {
      expect(
        getMedicationDisplayName({
          coding: [{ code: "123", display: "medication", system: "ABC" }],
        }),
      ).toBe("medication");
    });

    it("handles single un-named case", () => {
      expect(
        getMedicationDisplayName({
          coding: [{ code: "123", system: "ABC" }],
        }),
      ).toBe("Unknown medication name - ABC code 123");
    });

    it("handles multiple named case", () => {
      expect(
        getMedicationDisplayName({
          coding: [
            { code: "123", display: "first", system: "ABC" },
            { code: "456", display: "second", system: "DEF" },
          ],
        }),
      ).toBe("first");
    });

    it("handles multiple mixed named case", () => {
      expect(
        getMedicationDisplayName({
          coding: [
            { code: "123", system: "ABC" },
            { code: "456", display: "second", system: "DEF" },
          ],
        }),
      ).toBe("second");
    });

    it("handles multiple un-named case", () => {
      expect(
        getMedicationDisplayName({
          coding: [
            { code: "123", system: "ABC" },
            { code: "456", system: "DEF" },
          ],
        }),
      ).toBe("Unknown medication name - ABC code 123");
    });
  });

  describe("returnHtmlTableContent", () => {
    it("returns the html tables with a title", () => {
      const result = returnHtmlTableContent(
        BundleLabNoLabIds as Bundle,
        mappings["labResultDiv"],
        "test-title",
      );

      render(result);
      expect(screen.getByText("test-title")).toBeInTheDocument();
      expect(screen.getByText("SARS-CoV-2, NAA CL")).toBeInTheDocument();
      expect(
        screen.getByText("Symptomatic as defined by CDC?"),
      ).toBeInTheDocument();
      expect(screen.getAllByText("2000-02-04T21:02:00.000Z")).toHaveLength(2);
    });

    it("returns nothing if required table data is not available", () => {
      const result = returnHtmlTableContent(
        undefined as any,
        mappings["labResultDiv"],
        "test-title",
      );

      const { container } = render(result);
      expect(container).toBeEmptyDOMElement();
    });
  });
});
