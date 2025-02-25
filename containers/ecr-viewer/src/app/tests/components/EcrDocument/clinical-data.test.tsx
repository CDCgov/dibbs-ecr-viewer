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
});
