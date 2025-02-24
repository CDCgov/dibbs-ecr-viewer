import React, { Fragment } from "react";
import { DisplayDataProps } from "@/app/view-data/components/DataDisplay";
import sanitizeHtml from "sanitize-html";
import parse from "html-react-parser";
import { CodeableConcept } from "fhir/r4";

export interface PathMappings {
  [key: string]: string;
}

export interface CompleteData {
  availableData: DisplayDataProps[];
  unavailableData: DisplayDataProps[];
}

export type RenderableNode = string | React.JSX.Element;

export const noData = (
  <span className="no-data text-italic text-base">No data</span>
);

/**
 * Evaluates the provided display data to determine availability.
 * @param data - An array of display data items to be evaluated.
 * @returns - An object containing arrays of available and unavailable display data items.
 */
export const evaluateData = (data: DisplayDataProps[]): CompleteData => {
  let availableData: DisplayDataProps[] = [];
  let unavailableData: DisplayDataProps[] = [];
  data.forEach((item) => {
    if (!isDataAvailable(item)) {
      unavailableData.push(item);
    } else {
      availableData.push(item);
    }
  });
  return { availableData: availableData, unavailableData: unavailableData };
};

/**
 * Checks if data is available based on DisplayDataProps value. Also filters out terms that indicate info is unavailable.
 * @param item - The DisplayDataProps object to check for availability.
 * @returns - Returns true if data is available, false otherwise.
 */
export const isDataAvailable = (item: DisplayDataProps): Boolean => {
  if (
    !item.value ||
    (Array.isArray(item.value) && item.value.length === 0) ||
    item.value === noData
  )
    return false;
  const unavailableTerms = [
    "Not on file",
    "Not on file documented in this encounter",
    "Unknown",
    "Unknown if ever smoked",
    "Tobacco smoking consumption unknown",
    "Do not know",
    "No history of present illness information available",
  ];
  const valStr = removeHtmlElements(`${item.value}`).trim();
  return !unavailableTerms.some((t) => t === valStr);
};

/**
 * Parses and sanitizes the html while also mapping common hl7v3 tags to html.
 * @param val - The string of content to parse.
 * @returns - Returns sanitized and mapped content.
 */
export const safeParse = (val: string): RenderableNode => {
  const parsed = parse(
    sanitizeHtml(val, {
      transformTags: {
        paragraph: "p",
        list: "ul",
        item: "li",
        content: "span",
      },
    }),
  );

  return Array.isArray(parsed) ? arrayToElement(parsed) : parsed;
};

/**
 * Removes HTML tags from a given string.
 * @param element - The input string containing HTML elements.
 * @returns - A string with all HTML tags removed.
 */
export const removeHtmlElements = (element: string): string => {
  return sanitizeHtml(element, {
    allowedTags: [],
    allowedAttributes: {},
  });
};

/**
 * Collapses an array of values into one element.
 * @param vals - An array of strings and elments.
 * @returns - One string or element.
 */
export const arrayToElement = (vals: RenderableNode[]) => {
  // Filter out empty nodes.
  const trimmed = vals.map(trimEmptyElements).filter(Boolean);

  // An empty array is returned for an empty input
  if (trimmed.length === 0) {
    return "";
  } else if (trimmed.length === 1) {
    return vals[0];
  }

  // Wrap the items in a fragment and make sure they all have keys.
  // It reduces the cases to handle elsewhere in the logic and avoids
  // duplicate key warnings.
  return (
    <>
      {trimmed.map((item, ind) => {
        // Make sure items always have a key
        const key = `el-${ind}`;
        return typeof item !== "object" ? (
          <Fragment key={key}>{item}</Fragment>
        ) : (
          { ...item, key }
        );
      })}
    </>
  );
};

/**
 * Return "" if an element is empty, otherwise return the element.
 * <br /> are returned as is as it shouldn't have content in it.
 * @param val - A RenderableNode.
 * @returns - A string or element.
 */
const trimEmptyElements = (val: RenderableNode) => {
  if (typeof val === "string") {
    return val.trim();
  }

  // allowed to be empty - self-closing
  if (val.type === "br") return val;

  // got children? go ahead
  return val.props.children ? val : "";
};

/**
 * Return an iterator over values from start to end by step.
 * @param start - the starting index if `end` included, or stopping index if the only param (inclusive)
 * @param end - the stopping index (exclusive)
 * @param step - the number to count by (optional)
 * @returns - An iterator of indexes.
 */
export const range = (start: number, end?: number, step: number = 1) => {
  let output = [];

  if (typeof end === "undefined") {
    end = start;
    start = 0;
  }

  for (let i = start; i < end; i += step) {
    output.push(i);
  }

  return output;
};

/**
 * Returns the display value of a CodeableConcept.
 * @param codeableConcept - The CodeableConcept to get the display value from.
 * @param system - The system to search for in the CodeableConcept's coding array.
 * @returns - The display value of the CodeableConcept.
 */
export const getCodeableConceptDisplay = (
  codeableConcept: CodeableConcept | undefined,
  system?: string,
) => {
  if (!codeableConcept) {
    return undefined;
  }

  const { coding, text } = codeableConcept;

  // 1) If a system is specified, search for a matching coding.
  if (system) {
    const matchingCoding = coding?.find((c) => c.system === system);
    if (matchingCoding?.display) {
      return matchingCoding.display;
    }
  }

  // 2) Fallback to the CodeableConcept's text
  if (text) {
    return text;
  }

  // 3) If no text, try the first coding's display
  const firstCodingWithDisplay = coding?.find((c) => c.display);
  if (firstCodingWithDisplay?.display) {
    return firstCodingWithDisplay.display;
  }

  // 4) If no coding, return the first coding's code
  if (coding?.[0]?.code) {
    return coding[0].code;
  }

  // 5) Nothing found, return fallback
  return undefined;
};
