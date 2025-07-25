import { CodeableConcept } from "fhir/r4";

import {
  formatCodeableConcept,
  formatQuantity,
  formatRange,
} from "@/app/services/formatService";

describe("FormatService tests", () => {
  describe("Format CodeableConcept", () => {
    it("should return undefined if no coding is available", () => {
      const codeableConcept = undefined;

      const actual = formatCodeableConcept(codeableConcept);

      expect(actual).toBeUndefined();
    });

    it("should return the text value if available", () => {
      const textValue = "this is condition";
      const codeableConcept: CodeableConcept = {
        text: textValue,
        coding: [
          {
            display: "Condition",
            code: "64572001",
          },
        ],
      };

      const actual = formatCodeableConcept(codeableConcept);
      expect(actual).toEqual(textValue);
    });

    it("should return the first display value if there is no text value", () => {
      const correctDisplayValue = "Condition";
      const codeableConcept: CodeableConcept = {
        coding: [
          {
            display: "Condition",
            code: "64572001",
          },
          {
            display: "A Condition",
            code: "AC",
          },
        ],
      };

      const actual = formatCodeableConcept(codeableConcept);
      expect(actual).toEqual(correctDisplayValue);
    });

    it("should return the code and system of the first coding with both of them if there is no text or display value", () => {
      const codeValue = "64572001";
      const systemValue = "http://snomed.info/sct";
      const codeableConcept: CodeableConcept = {
        coding: [
          {
            code: "AC",
          },
          {
            code: codeValue,
            system: systemValue,
          },
        ],
      };

      const actual = formatCodeableConcept(codeableConcept);
      expect(actual).toEqual(`${codeValue} (${systemValue})`);
    });

    it("should return the code of the first first coding with a code if there is no text, display, or a code/system pair", () => {
      const codeValue = "64572001";
      const codeableConcept: CodeableConcept = {
        coding: [
          {
            code: codeValue,
          },
        ],
      };

      const actual = formatCodeableConcept(codeableConcept);
      expect(actual).toEqual(codeValue);
    });
  });

  describe("formatQuantity", () => {
    it("should handle missing data", () => {
      expect(formatQuantity({})).toBeUndefined();
    });

    it("should handle missing unit", () => {
      expect(formatQuantity({ value: 1.234 })).toBe("1.234");
    });

    it("should handle percent unit", () => {
      expect(formatQuantity({ value: 1.234, unit: "%" })).toBe("1.234%");
    });

    it("should handle mapped unit", () => {
      expect(formatQuantity({ value: 1.234, unit: "[lb_av]" })).toBe(
        "1.234 lb",
      );
    });

    it("should handle regular unit", () => {
      expect(formatQuantity({ value: 1.234, unit: "mmol/L" })).toBe(
        "1.234 mmol/L",
      );
    });

    it("should handle numeric unit", () => {
      expect(formatQuantity({ value: 1.234, unit: "10*3uL" })).toBe(
        "1.234 10*3uL",
      );
    });
  });

  describe("formatRange", () => {
    it("should handle missing data", () => {
      expect(formatRange({})).toBeUndefined();
    });

    it("should low and high", () => {
      expect(
        formatRange({
          low: { value: 1.234, unit: "%" },
          high: { value: 2, unit: "[lb_av]" },
        }),
      ).toBe("1.234% - 2 lb");
    });

    it("should low only", () => {
      expect(formatRange({ low: { value: 1.234 } })).toBe(">=1.234");
    });

    it("should high only", () => {
      expect(formatRange({ high: { value: 1.234 } })).toBe("<=1.234");
    });
  });
});
