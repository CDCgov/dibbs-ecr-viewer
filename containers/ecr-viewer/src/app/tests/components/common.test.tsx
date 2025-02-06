import { loadYamlConfig } from "@/app/api/utils";
import {
  getMedicationDisplayName,
  returnHtmlTableContent,
  returnTableFromJson,
} from "@/app/view-data/components/common";
import BundleLabNoLabIds from "../assets/BundleLabNoLabIds.json";
import { Bundle } from "fhir/r4";
import { render, screen } from "@testing-library/react";
import { TableJson } from "@/app/services/formatService";

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

  describe("returnTableFromJson", () => {
    it("returns an HTML representation of the table", () => {
      const tableJson = {
        resultName: "test-name",
        tables: [
          [
            {
              col1: { value: "val1", metadata: {} },
              col2: { value: "val2", metadata: {} },
            },
          ],
        ],
      };

      const result = returnTableFromJson(tableJson as TableJson);
      render(result);
      expect(screen.getByText("test-name")).toBeInTheDocument();
      expect(screen.getByText("col1")).toBeInTheDocument();
      expect(screen.getByText("col2")).toBeInTheDocument();
      expect(screen.getByText("val1")).toBeInTheDocument();
      expect(screen.getByText("val2")).toBeInTheDocument();
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
  });
});
