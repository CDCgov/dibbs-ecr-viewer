import React from "react";
import { ToolTipElement } from "@/app/view-data/components/ToolTipElement";
import { Address, ContactPoint, HumanName } from "fhir/r4";
import sanitizeHtml from "sanitize-html";
import { RenderableNode, safeParse } from "../view-data/utils/utils";
import { parse, HTMLElement, Node, NodeType } from "node-html-parser";

interface Metadata {
  [key: string]: string;
}

export interface TableRow {
  [key: string]: {
    value: any;
    metadata?: Metadata;
  };
}

export interface TableJson {
  resultId?: string;
  resultName?: string;
  tables?: TableRow[][];
}

/**
 * Formats a person's name: <use>: <prefix> <given> <family> <suffix>.
 * @param humanName - The HumanName object containing the name components.
 * @param withUse - Whether to include the name use in the formatted string.
 * @returns The formatted name string.
 */
export const formatName = (
  humanName: HumanName | undefined,
  withUse: boolean = false,
): string => {
  if (!humanName) {
    return "";
  }

  const { use, prefix, given, family, suffix } = humanName;

  const segments = [
    ...(withUse && use ? [`${toSentenceCase(use)}:`] : []),
    ...(prefix?.map(toTitleCase) ?? []),
    ...(given?.map(toTitleCase) ?? []),
    toTitleCase(family ?? ""),
    ...(suffix ?? []),
  ];

  return segments.filter(Boolean).join(" ");
};

const DEFAULT_ADDRESS_CONFIG = { includeUse: false, includePeriod: false };
type AddressConfig = { includeUse?: boolean; includePeriod?: boolean };

/**
 * Formats an address based on its components.
 * @param address - Object with address parts
 * @param address.line - An array containing street address lines.
 * @param address.city - The city name.
 * @param address.state - The state or region name.
 * @param address.postalCode - The ZIP code or postal code.
 * @param address.country - The country name.
 * @param address.use - Optional address use.
 * @param address.period - Optional address use.
 * @param config - Configuration object to customize formatting
 * @param config.includeUse - Include the use (e.g. `Home:`) on the address if available (default: false)
 * @param config.includePeriod - Include the perios (e.g. `Dates: 12/11/2023 - Present`) on the address if available (default: false)
 * @returns The formatted address string.
 */
export const formatAddress = (
  { line, city, state, postalCode, country, use, period }: Address = {},
  config: AddressConfig = {},
) => {
  const { includeUse, includePeriod } = {
    ...DEFAULT_ADDRESS_CONFIG,
    ...config,
  };

  const formatDateLine = () => {
    const stDt = formatDate(period?.start);
    const endDt = formatDate(period?.end);
    if (!stDt && !endDt) return false;
    return `Dates: ${stDt ?? "Unknown"} - ${endDt ?? "Present"}`;
  };

  return [
    includeUse && use && toSentenceCase(use) + ":",
    (line?.map(toTitleCase) || []).filter(Boolean).join("\n"),
    [toTitleCase(city), state].filter(Boolean).join(", "),
    [postalCode, country].filter(Boolean).join(", "),
    includePeriod && formatDateLine(),
  ]
    .filter(Boolean)
    .join("\n");
};

// Determine if we can extract out the timezone part of the datetime string.
const hasTimeZoneString = (dateTimeString: string): boolean => {
  // Z
  if (dateTimeString.match(/[0-9]Z$/)) return true;

  // EDT, GMT-5, UTC+3
  if (
    dateTimeString
      .split(/\s/)
      .at(-1)
      ?.match(/^[A-Z]{3,}/)
  )
    return true;

  // +/-nn[:?[nn]]
  if (dateTimeString.match(/[+-]\d{1,2}:?\d{2}$/)) return true;

  return false;
};

// yyyymmdd[hhmmss][+-zzzz] to ISO
const reformatNumericTimestampToISO = (dateTimeString: string) => {
  // datetime is 20240101[1234][56][-0400] style
  const parts = dateTimeString.match(
    /(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?([+-]\d{4})?/,
  );
  // The regex didn't consume everything
  if (!parts) {
    return dateTimeString;
  }
  const dateParts = parts.slice(1, 4);
  const timeParts = parts.slice(4, 7).filter(Boolean);
  const tzPart = parts.at(-1);

  let newDateStr = dateParts.join("-");
  if (timeParts.length > 0) {
    newDateStr += "T";
    newDateStr += timeParts.join(":");
  }
  if (tzPart) {
    newDateStr += tzPart;
  }
  return newDateStr;
};

/**
 * Format a datetime string to "MM/DD/YYYY HH:MM AM/PM Z" where "Z" is the timezone abbreviation.If
 * the input string contains a UTC offset then the returned string will be in the format
 * "MM/DD/YYYY HH:MM AM/PM ZZZ". If there is no timezone indicated on the input date string, none will
 * be returned on the output. If the input string do not contain a time part, the returned
 * string will be in the format "MM/DD/YYYY". If the input string is not in the expected format, it
 * will be returned as is. If the input is falsy a blank string will be returned. The following
 * formats are supported:
 * - "YYYY-MM-DDTHH:MM±HH:MM"
 * - "YYYY-MM-DDTHH:MMZ"
 * - "YYYY-MM-DD"
 * - "MM/DD/YYYY HH:MM AM/PM ±HH:MM"
 * - "YYYYMMDDHHMMSS±HHMM"
 * @param dateTimeString datetime string.
 * @returns Formatted datetime string.
 */
export const formatDateTime = (dateTimeString: string | undefined): string => {
  if (!dateTimeString) {
    return "";
  }

  const date = new Date(dateTimeString);
  if (date.toString() === "Invalid Date") {
    // datetime is 20240101[1234][56][-0400] style?
    const newDateStr = reformatNumericTimestampToISO(dateTimeString);
    if (newDateStr !== dateTimeString) {
      return formatDateTime(newDateStr);
    }

    // If we are unable to format the date, return as is
    return dateTimeString;
  }

  // time as 00:00[:000]
  const hasTime = dateTimeString.includes(":");
  if (!hasTime) {
    return formatDate(dateTimeString) || dateTimeString;
  }

  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  };
  const formatted = (date as unknown as Date)
    .toLocaleDateString("en-Us", options)
    .replace(",", "");

  // Not actually time zoned
  if (!hasTimeZoneString(dateTimeString)) {
    return formatted.slice(0, formatted.lastIndexOf(" ")); // lop off " EDT"
  }

  // encourage word wrapping between date and time instead of wherever
  const parts = formatted.split(" ");
  return `${parts[0]} ${parts.slice(1).join("\u00A0")}`;
};

/**
 * Formats the provided date string into a formatted date string with year, month, and day.
 * @param dateString - The date string to be formatted. formatDate will also be able to take 'yyyymmdd' as input
 * @returns - The formatted date string, "Invalid Date" if input date was invalid, or undefined if the input date is falsy.
 */
export const formatDate = (dateString?: string): string | undefined => {
  if (dateString) {
    let date = new Date(dateString);

    if (date.toString() === "Invalid Date") {
      const newDateStr = reformatNumericTimestampToISO(dateString);
      if (newDateStr !== dateString) {
        return formatDate(newDateStr);
      }

      return undefined;
    }

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "UTC",
    }); // UTC, otherwise will have timezone issues
  }
};

const VALID_PHONE_NUMBER_REGEX = /^\d{3}-\d{3}-\d{4}$/;
/**
 * Formats a phone number into a standard format of XXX-XXX-XXXX.
 * @param phoneNumber - The phone number to format.
 * @returns The formatted phone number or "Invalid Number" if the input is invalid or undefined if the input is empty.
 */
export const formatPhoneNumber = (
  phoneNumber: string | undefined,
): string | undefined => {
  if (!phoneNumber || phoneNumber.trim() === "") return undefined;

  const formatted = phoneNumber
    .replace("+1", "")
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");

  if (VALID_PHONE_NUMBER_REGEX.test(formatted)) {
    return formatted;
  } else {
    return "Invalid Number";
  }
};

/**
 * Formats the provided start and end date-time strings and returns a formatted string
 * with both the start and end times. Each time is labeled and separated by a carriage return
 * and newline for clarity in display or further processing.
 * @param startDateTime - The start date-time string to be formatted.
 * @param endDateTime - The end date-time string to be formatted.
 * @returns A string with the formatted start and end times, each on a new line.
 */
export const formatStartEndDateTime = (
  startDateTime: string | undefined,
  endDateTime: string | undefined,
) => formatStartEnd(startDateTime, endDateTime, formatDateTime);

/**
 * Formats the provided start and end date strings and returns a formatted string
 * with both the start and end dates. Each date is labeled and separated by a carriage return
 * and newline for clarity in display or further processing.
 * @param startDate - The start date-time string to be formatted.
 * @param endDate - The end date-time string to be formatted.
 * @returns A string with the formatted start and end times, each on a new line.
 */
export const formatStartEndDate = (
  startDate: string | undefined,
  endDate: string | undefined,
) => formatStartEnd(startDate, endDate, formatDate);

const formatStartEnd = (
  start: string | undefined,
  end: string | undefined,
  formatFn: (dt: string | undefined) => string | undefined,
) => {
  const textArray: String[] = [];

  const startDateObject = formatFn(start);
  const endDateObject = formatFn(end);

  if (startDateObject) {
    textArray.push(`Start: ${startDateObject}`);
  }
  if (endDateObject) {
    textArray.push(`End: ${endDateObject}`);
  }

  return textArray.join("\n");
};

/**
 * Formats vital signs information into separate strings with proper units.
 * @param heightAmount - The amount of height.
 * @param heightUnit - The measurement type of height (e.g., "[in_i]" for inches, "cm" for centimeters).
 * @param weightAmount - The amount of weight.
 * @param weightUnit - The measurement type of weight (e.g., "[lb_av]" for pounds, "kg" for kilograms).
 * @param bmiAmount - The Body Mass Index (BMI).
 * @param bmiUnit - The measurement type of Body Mass Index (BMI) (e.g., kg/m2)
 * @returns The formatted vital signs information.
 */
export const formatVitals = (
  heightAmount: string,
  heightUnit: string,
  weightAmount: string,
  weightUnit: string,
  bmiAmount: string,
  bmiUnit: string,
) => {
  let heightString = "";
  let weightString = "";
  let bmiString = "";
  let heightType = "";
  let weightType = "";

  if (heightAmount && heightUnit) {
    if (heightUnit === "[in_i]") {
      heightType = "in";
    } else if (heightUnit === "cm") {
      heightType = "cm";
    }
    heightString = `${heightAmount} ${heightType}`;
  }

  if (weightAmount && weightUnit) {
    if (weightUnit === "[lb_av]") {
      weightType = "lb";
    } else if (weightUnit === "kg") {
      weightType = "kg";
    }
    weightString = `${weightAmount} ${weightType}`;
  }

  if (bmiAmount && bmiUnit) {
    bmiString = `${bmiAmount} ${bmiUnit}`;
  }

  return { height: heightString, weight: weightString, bmi: bmiString };
};

/**
 * Formats a string by converting it to lowercase, replacing spaces with hyphens, and removing special characters except underscores.
 * @param input - The input string to be formatted.
 * @returns The formatted string.
 */
export const toKebabCase = (input: string): string => {
  // Convert to lowercase
  let result = input.toLowerCase();

  // Replace spaces with hyphens
  result = result.replace(/\s+/g, "-");

  // Remove all special characters except hyphens
  result = result.replace(/[^a-z0-9\-]/g, "");

  return result;
};

/**
 * Returns the first non-comment child node of the given HTML element.
 * This function iterates over all child nodes of the provided element and returns the first child that is not a comment node.
 * If all child nodes are comments, or if there are no children, it returns `null`.
 * @param li - The HTML element to search for the first non-comment child node.
 * @returns - The first non-comment child node, or `null` if none is found.
 */
export function getFirstNonCommentChild(li: HTMLElement): Node | null {
  for (let i = 0; i < li.childNodes.length; i++) {
    const node = li.childNodes[i];
    if (node.nodeType === NodeType.COMMENT_NODE) continue;
    if (node.nodeType === NodeType.TEXT_NODE && node.textContent.trim() === "")
      continue;

    return node; // Return the first non-comment node
  }
  return null; // Return null if no non-comment node is found
}

/**
 * Extracts the `data-id` attribute from the element or its ID if there is no `data-id` attribute.
 * @param elem - The element to search for the `data-id`.
 * @returns  - The extracted `data-id` value if found, otherwise `null`.
 */
export function getDataId(elem: HTMLElement | HTMLTableElement | Element) {
  if (elem.getAttribute("data-id")) {
    return elem.getAttribute("data-id");
  } else if (elem.id) {
    return elem.id;
  } else {
    return null; // Return null if no match is found
  }
}

/**
 * Parses an HTML string containing tables or a list of tables and converts each table into a JSON array of objects.
 * Each <li> item represents a different lab result. The resulting JSON objects contain the data-id (Result ID)
 * and text content of the <li> items, along with an array of JSON representations of the tables contained within each <li> item.
 * @param htmlString - The HTML string containing tables to be parsed.
 * @returns - An array of JSON objects representing the list items and their tables from the HTML string.
 * @example @returns [{resultId: 'Result.123', resultName: 'foo', tables: [{}, {},...]}, ...]
 */
export function formatTablesToJSON(htmlString: string): TableJson[] {
  // We purposefully don't sanitize here to remain close to the original format while
  // looking for specific patterns. The data is sanitized as it's pulled out.
  const doc = parse(htmlString);
  const jsonArray: any[] = [];

  // <li>{name}<table/></li> OR <list><item>{name}<table /></item></list>
  const liArray = doc.querySelectorAll("li, list > item");
  if (liArray.length > 0) {
    liArray.forEach((li) => {
      const tables: any[] = [];
      const resultId = getDataId(li);
      const firstChildNode = getFirstNonCommentChild(li);
      const resultName = firstChildNode ? getElementText(firstChildNode) : "";
      li.querySelectorAll("table").forEach((table) => {
        tables.push(processTable(table));
      });
      jsonArray.push({ resultId, resultName, tables });
    });

    return jsonArray;
  }

  // <table><caption>{name}</caption></table>
  const tableWithCaptionArray: HTMLElement[] =
    doc.querySelectorAll("table:has(caption)");
  if (tableWithCaptionArray.length > 0) {
    tableWithCaptionArray.forEach((table) => {
      const caption = table.childNodes.find((n) => n.rawTagName === "caption");
      const resultName = getElementText(caption as HTMLElement);
      const resultId = getDataId(table) ?? undefined;
      jsonArray.push({ resultId, resultName, tables: [processTable(table)] });
    });

    return jsonArray;
  }

  // <content>{name}</content><br/><table/>
  const contentArray = doc.querySelectorAll("content");
  if (contentArray.length > 0) {
    contentArray.forEach((content) => {
      const resultName = getElementText(content);
      const tables: any[] = [];
      let sibling = content.nextElementSibling;

      while (sibling !== null && sibling.tagName.toLowerCase() !== "content") {
        if (sibling.tagName.toLowerCase() === "table") {
          tables.push(processTable(sibling));
        }
        sibling = sibling.nextElementSibling;
      }

      if (tables.length > 0) jsonArray.push({ resultName, tables });
    });

    if (jsonArray.length > 0) {
      return jsonArray;
    }
  }

  // <table/>
  const tableWithNoCaptionArray = doc.querySelectorAll("table");
  if (tableWithNoCaptionArray.length > 0) {
    tableWithNoCaptionArray.forEach((table) => {
      const resultName = "";
      const resultId = getDataId(table) ?? undefined;
      jsonArray.push({ resultId, resultName, tables: [processTable(table)] });
    });

    return jsonArray;
  }

  return jsonArray;
}

/**
 * Processes a single HTML table element, extracting data from rows and cells, and converts it into a JSON array of objects.
 * This function extracts data from <tr> and <td> elements within the provided table element.
 * The content of <th> elements is used as keys in the generated JSON objects.
 * @param table - The HTML table element to be processed.
 * @returns - An array of JSON objects representing the rows and cells of the table.
 */
function processTable(table: HTMLElement): TableRow[] {
  const jsonArray: any[] = [];
  const rows = table.querySelectorAll("tr");
  const keys: string[] = [];
  let hasHeaders = false;

  const headers = rows[0].querySelectorAll("th");
  if (headers.length > 0) {
    hasHeaders = true;
    headers.forEach((header) => {
      keys.push(getElementText(header));
    });
  }

  rows.forEach((row, rowIndex) => {
    // Skip the first row as it contains headers
    if (hasHeaders && rowIndex === 0) return;

    const obj: TableRow = {};
    row.querySelectorAll("td").forEach((cell, cellIndex) => {
      const key = hasHeaders ? keys[cellIndex] : "Unknown Header";

      const metadata: Metadata = {};
      const attributes = cell.attributes || [];
      for (const [attrName, attrValue] of Object.entries(attributes)) {
        if (attrName && attrValue) {
          metadata[attrName.toLowerCase()] = attrValue.toString();
        }
      }
      let value = getElementContent(cell);
      if (
        typeof value === "string" &&
        (key.toLowerCase().includes("date") ||
          key.toLowerCase().includes("time"))
      ) {
        value = formatDateTime(value);
      }
      obj[key] = { value, metadata };
    });
    jsonArray.push(obj);
  });

  return jsonArray;
}

/**
 * Extracts the html content from an element and sanitizes and maps it so it is safe to render.
 * @param el - An HTML element or node.
 * @returns A sanitized and parsed snippet of JSX.
 * @example @param el - <paragraph><!-- comment -->Values <content>here</content></paragraph>
 * @example @returns - <p>Values <span>here</span></p>
 */
function getElementContent(el: Node): RenderableNode {
  const rawValue = (el as HTMLElement)?.innerHTML ?? el.textContent;
  const value = rawValue?.trim() ?? "";
  if (value === "") return value;
  let res = safeParse(value);
  return res;
}

/**
 * Extracts the text content from an element and concatenates it.
 * @param el - An HTML element or node.
 * @returns A string with the text data.
 * @example @param el - <paragraph><!-- comment -->Values <content>here</content></paragraph>
 * @example @returns - 'Values here'
 */
function getElementText(el: Node): string {
  return el.textContent?.trim() ?? "";
}

/**
 * Extracts and concatenates all sequences of numbers and periods from each string in the input array,
 * excluding any leading and trailing periods in the first matched sequence of each string.
 * @param inputValues - An array of strings from which numbers and periods will be extracted.
 * @returns An array of strings, each corresponding to an input string with all found sequences
 * of numbers and periods concatenated together, with any leading period in the first sequence removed.
 * @example @param inputValues - ['#Result.1.2.840.114350.1.13.297.3.7.2.798268.1670845.Comp2']
 * @example @returns - ['1.2.840.114350.1.13.297.3.7.2.798268.1670845']
 */
export function extractNumbersAndPeriods(inputValues: string[]): string[] {
  return inputValues.map((value) => {
    // Find all sequences of numbers and periods up to the first occurrence of a letter
    const pattern: RegExp = /[0-9.]+(?=[a-zA-Z])/;
    const match: RegExpMatchArray | null = value.match(pattern);

    if (match && match[0]) {
      // Remove leading and trailing periods from the match
      const cleanedMatch = match[0].replace(/^\./, "").replace(/\.$/, "");
      return cleanedMatch;
    }
    return "";
  });
}

/**
 * Converts a string to sentence case, making the first character uppercase and the rest lowercase.
 * @param str - The string to convert to sentence case.
 * @returns The converted sentence-case string. If the input is empty or not a string, the original input is returned.
 */
export function toSentenceCase(str: string | undefined) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
/**
 * Converts a string to title case, making the first character of each word uppercase.
 * @param str - The string to convert to title case.
 * @returns The converted title-case string. If the input is empty or not a string, the original input is returned.
 */
export const toTitleCase = (str: string | undefined) => {
  if (!str) return str;
  return str.replace(
    /\w\S*/g,
    (text) => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase(),
  );
};

/**
 * Adds a caption to a table element.
 * @param element - The React element representing the table.
 * @param caption - The caption text to be added.
 * @param toolTip - Tooltip for caption
 * @returns A React element with the caption added as the first child of the table.
 */
export const addCaptionToTable = (
  element: React.ReactNode,
  caption: string,
  toolTip?: string,
) => {
  if (React.isValidElement(element) && element.type === "table") {
    return React.cloneElement(element, {}, [
      <caption key="caption">
        <ToolTipElement toolTip={toolTip}>
          <div className="data-title">{caption}</div>
        </ToolTipElement>
      </caption>,
      ...React.Children.toArray(element.props.children),
    ]);
  }

  return element;
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

const contactSortOrder = [
  "phone",
  "fax",
  "sms",
  "pager",
  "url",
  "email",
  "other",
  "",
];

/**
 * Sorts an array of contact points in display order (`contactSortOrder`).
 * @param contactPoints - array of contact points
 * @returns sorted array of contact points
 */
const sortContacts = (contactPoints: ContactPoint[]): ContactPoint[] => {
  return contactPoints.sort((a, b) => {
    const aInd =
      contactSortOrder.indexOf(a.system ?? "") ?? contactSortOrder.length;
    const bInd =
      contactSortOrder.indexOf(b.system ?? "") ?? contactSortOrder.length;
    return aInd - bInd;
  });
};

/**
 * Converts contact points into an array of phone numbers and emails and returns them
 * in a consistent sort order for display.
 * @param contactPoints - array of contact points
 * @returns string of formatted and sorted phone numbers and emails
 */
export const formatContactPoint = (
  contactPoints: ContactPoint[] | undefined,
): string => {
  if (!contactPoints || !contactPoints.length) {
    return "";
  }
  const contactArr: string[] = [];
  for (const { system, value, use } of sortContacts(contactPoints)) {
    // No value, nothing to format/show
    if (!value) continue;

    if (system === "phone") {
      const phoneNumberUse = toSentenceCase(use);
      contactArr.push(
        [phoneNumberUse, formatPhoneNumber(value)].filter((c) => c).join(": "),
      );
    } else if (system === "email") {
      contactArr.push(value.toLowerCase());
    } else {
      const _use = toSentenceCase(use ?? "");
      const _system = toSentenceCase(system ?? "");
      const _value = ["fax", "pager", "sms"].includes(system as string)
        ? formatPhoneNumber(value)
        : value;
      contactArr.push([_use, `${_system}:`, _value].join(" ").trim());
    }
  }
  return contactArr.join("\n");
};
