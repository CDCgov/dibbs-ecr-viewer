import React from "react";
import {
  isDataAvailable,
  removeHtmlElements,
  safeParse,
} from "@/app/utils/data-utils";
import { render, cleanup } from "@testing-library/react";
import { DisplayDataProps } from "@/app/view-data/components/DataDisplay";

describe("Utils", () => {
  describe("isDataAvailable", () => {
    it("given an item with no value, it should return false", () => {
      const input: DisplayDataProps = {};
      const result = isDataAvailable(input);
      expect(result).toEqual(false);
    });
    it("given an item with no length in its value array, it should return false", () => {
      const input: DisplayDataProps = {
        value: [],
      };
      const result = isDataAvailable(input);
      expect(result).toEqual(false);
    });
    it("given an item whose value matches one of the unavailable terms, it should return false", () => {
      const input: DisplayDataProps = {
        value: "Not on file documented in this encounter",
      };
      const result = isDataAvailable(input);
      expect(result).toEqual(false);
    });
    it("given an item with available info, it should return true", () => {
      const input: DisplayDataProps = {
        value: "01/01/1970",
      };
      const result = isDataAvailable(input);
      expect(result).toEqual(true);
    });
  });

  describe("safeParse", () => {
    it("should leave a string safe HTML", () => {
      const str = "hi there";
      const actual = safeParse(str);
      expect(actual).toBe(str);
    });

    it("should leave alone nice safe HTML", () => {
      const str = "<p>hi there</p>";
      const jsx = <p>hi there</p>;
      const actual = safeParse(str);
      expect(actual).toStrictEqual(jsx);
    });

    it("should remove empty nodes", () => {
      const str = `<p></p><br/><span>hiya</span>`;
      const parsed = safeParse(str);
      const { asFragment } = render(parsed);
      expect(asFragment()).toMatchSnapshot();
      cleanup();
    });

    it("should map xml-y HTML", () => {
      const str = `<paragraph>hi there</paragraph><content ID="abc">I'm content</content><list><item>one</item><item>two</item></list>`;
      const parsed = safeParse(str);
      const { asFragment } = render(parsed);
      expect(asFragment()).toMatchSnapshot();
      cleanup();
    });

    it("should remove comments", () => {
      const str = `<!-- Data ID: 123 --><paragraph>hi there</paragraph>I'm content<list><item>one</item><item>two</item></list>`;
      const parsed = safeParse(str);
      const { asFragment } = render(parsed);
      expect(asFragment()).toMatchSnapshot();
      cleanup();
    });
  });

  describe("removeHtmlElements", () => {
    it("should remove all HTML tags from string", () => {
      const input = "<div><p>Hello <br/>there</p></div>";
      const expected = "Hello there";

      const result = removeHtmlElements(input);
      expect(result).toEqual(expected);
    });
    it("should return the same string if no HTML tags are included", () => {
      const input = "Hello there";
      const expected = "Hello there";

      const result = removeHtmlElements(input);
      expect(result).toEqual(expected);
    });
  });
});
