import {
  toKebabCase,
  extractNumbersAndPeriods,
  toSentenceCase,
  toTitleCase,
} from "@/app/utils/format-utils";

describe("FormatService tests", () => {
  describe("toKebabCase", () => {
    it("should convert string to lowercase", () => {
      expect(toKebabCase("HELLO")).toBe("hello");
    });

    it("should replace spaces with hyphens", () => {
      expect(toKebabCase("hello world")).toBe("hello-world");
    });

    it("should remove special characters", () => {
      expect(toKebabCase("Hello@World!")).toBe("helloworld");
    });
  });

  describe("extractNumbersAndPeriods", () => {
    it("should return the correctly formatted sequence of numbers and periods", () => {
      const inputArray = [
        "#Result.1.2.840.114350.1.13.297.3.7.2.798268.1670845.Comp2",
        "#Result.1.2.840.114350.1.13.297.3.7.2.798268.1670844.Comp3",
      ];
      const expectedResult = [
        "1.2.840.114350.1.13.297.3.7.2.798268.1670845",
        "1.2.840.114350.1.13.297.3.7.2.798268.1670844",
      ];

      const result = extractNumbersAndPeriods(inputArray);
      expect(result).toEqual(expectedResult);
    });

    it("should return an empty string if no periods are found", () => {
      const inputArray = ["foo", "bar"];
      const expectedResult = ["", ""];

      const result = extractNumbersAndPeriods(inputArray);
      expect(result).toEqual(expectedResult);
    });

    it("should return an empty string if only one period is found", () => {
      const inputArray = ["foo.bar", "hello.there"];
      const expectedResult = ["", ""];

      const result = extractNumbersAndPeriods(inputArray);
      expect(result).toEqual(expectedResult);
    });
  });

  describe("toSentenceCase", () => {
    it("should return string in sentence case", () => {
      const input = "hello there";
      const expected = "Hello there";

      const result = toSentenceCase(input);
      expect(result).toEqual(expected);
    });
    it("should return undefined if string is empty", () => {
      const result = toSentenceCase(undefined);
      expect(result).toBeUndefined();
    });
  });

  describe("toTitleCase", () => {
    it("should return string in title case", () => {
      const input = "HAN SOLO";
      const expected = "Han Solo";

      const result = toTitleCase(input);
      expect(result).toEqual(expected);
    });
    it("should return single-character word in title case", () => {
      const input = "a";
      const expected = "A";

      const result = toTitleCase(input);
      expect(result).toEqual(expected);
    });
    it("should return multi-line string in title case", () => {
      const input = "facility name 1\nfacility name 2";
      const expected = "Facility Name 1\nFacility Name 2";

      const result = toTitleCase(input);
      expect(result).toEqual(expected);
    });
    it("should return undefined if string is empty", () => {
      const result = toTitleCase(undefined);
      expect(result).toBeUndefined();
    });
  });
});
