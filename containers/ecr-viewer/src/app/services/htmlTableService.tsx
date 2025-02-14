import React from "react";
import { ToolTipElement } from "@/app/view-data/components/ToolTipElement";
import { RenderableNode, safeParse } from "@/app/utils/data-utils";
import { parse, HTMLElement, Node, NodeType } from "node-html-parser";
import { formatDateTime } from "./formatDateService";

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
