import { ReactNode } from "react";

import { Table } from "@trussworks/react-uswds";
import classNames from "classnames";
import { Element } from "fhir/r4";

import { evaluateValue } from "@/app/utils/evaluate";
import fhirPathMappings, { FhirPath } from "@/app/utils/evaluate/fhir-paths";

import EvaluateTableRow from "./EvaluateTableRow";

export type Mapping = {
  [key: string]: string | FhirPath<string>;
};

export interface ColumnInfoInput {
  columnName: string;
  infoPath?: string;
  value?: ReactNode;
  className?: string;
  hiddenBaseText?: string;
  applyToValue?: (value: string) => ReactNode;
  evaluateEntry?: (el: Element) => ReactNode;
  sortFn?: (a: string, b: string) => number;
}

interface TableProps {
  resources: Element[];
  mappings?: Mapping;
  columns: ColumnInfoInput[];
  caption?: string;
  className?: string;
  fixed?: boolean;
  outerBorder?: boolean;
}
/**
 * Formats a table based on the provided resources, mappings, columns, and caption.
 * @param props - The properties for configuring the table.
 * @param props.resources - An array of FHIR Resources representing the data entries. Data for each table row is collected from each resource.
 * @param props.mappings - An object containing the FHIR path mappings (default: `fhirPathMappings`)
 * @param props.columns - An array of objects representing column information. The order of columns in the array determines the order of appearance.
 * @param props.caption - The caption for the table.
 * @param props.className - (Optional) Classnames to be applied to table.
 * @param props.fixed - Determines whether to fix the width of the table columns. Default is true.
 * @param props.outerBorder - Determines whether to include an outer border for the table. Default is true
 * @returns - A formatted table React element.
 */
const EvaluateTable = ({
  resources,
  mappings = fhirPathMappings,
  columns,
  caption,
  className,
  fixed = true,
  outerBorder = true,
}: TableProps): React.JSX.Element => {
  const tableRowData = resources.map((entry) =>
    evaluateTableRowData(columns, mappings, entry),
  );

  columns.forEach(({ sortFn }, i) => {
    if (!sortFn) return;

    tableRowData.sort((aRow, bRow) => {
      const a = aRow.rowCellsData[i].data;
      const b = bRow.rowCellsData[i].data;
      if (typeof a !== "string" || typeof b !== "string") return 0;
      return sortFn(a, b);
    });
  });

  return (
    <BaseTable
      columns={columns}
      caption={caption}
      className={className}
      fixed={fixed}
      outerBorder={outerBorder}
    >
      {tableRowData.map((row, index) => (
        <EvaluateTableRow
          key={index}
          tableRowData={row}
          numCols={columns.length}
        />
      ))}
    </BaseTable>
  );
};

/**
 * Builds a table component with the provided headers, rows, and configurations.
 * @param props - The parameters for building the table.
 * @param props.columns - The column info to build headers from.
 * @param props.caption - The caption for the table.
 * @param props.className - (Optional) Classnames to be applied to table.
 * @param props.fixed (default=true) - Whether the table forces equal width columns.
 * @param props.outerBorder (default=true) - Whether the table has an outer border.
 * @param props.children - The rows of the table.
 * @returns JSX Element representing the table component.
 */
export const BaseTable = ({
  columns,
  caption,
  className,
  fixed = true,
  outerBorder = true,
  children,
}: {
  columns: ColumnInfoInput[];
  caption?: React.ReactNode;
  className?: string;
  fixed?: boolean;
  outerBorder?: boolean;
  children: React.ReactNode;
}) => {
  return (
    <Table
      fixed={fixed}
      bordered={false}
      fullWidth={true}
      caption={caption}
      className={classNames("table-caption-margin", className, {
        "border-top border-left border-right": outerBorder,
      })}
      data-testid="table"
    >
      <thead>
        <BaseTableHeaders columns={columns} />
      </thead>
      <tbody>{children}</tbody>
    </Table>
  );
};

/**
 * Builds table headers from the given columns.
 * @param props - component props
 * @param props.columns - The column info to build headers from.
 * @returns An array of table header elements.
 */
const BaseTableHeaders = ({
  columns,
}: {
  columns: ColumnInfoInput[];
}): React.JSX.Element => {
  return (
    <tr>
      {columns.map((column, index) => (
        <th
          key={`${column.columnName}${index}`}
          scope="col"
          className={classNames("table-header", column.className)}
        >
          {column.columnName}
        </th>
      ))}
    </tr>
  );
};

/**
 * Builds a row for a table based on provided columns, mappings, and entry data.
 * @param columns - An array of column objects defining the structure of the row.
 * @param mappings - An object containing mappings for column data.
 * @param entry - The data entry object for the row.
 * @returns - A TableRowData object for use with EvaluateTableRow.
 */
const evaluateTableRowData = (
  columns: ColumnInfoInput[],
  mappings: Mapping,
  entry: Element,
) => {
  const rowCellsData = columns.map((column) =>
    evaluateTableRowCell(column, entry, mappings),
  );
  const hiddenRow = rowCellsData.find(
    ({ hiddenRow }) => !!hiddenRow,
  )?.hiddenRow;

  // This row is entirely empty, skip it
  if (rowCellsData.every(({ data }) => !data))
    return { rowCellsData: [], hiddenRow };

  return { rowCellsData, hiddenRow };
};

/**
 * Evaluate data for a column and entry
 * @param column column descriptor
 * @param entry fhir data to extract value from
 * @param mappings mappings to use in evaluating data
 * @returns data, hidden status, and hiddenRow
 */
export const evaluateTableRowCell = (
  column: ColumnInfoInput,
  entry: Element,
  mappings: Mapping,
) => {
  let data: ReactNode;
  let hiddenRow: ReactNode = null;
  let hidden = false;
  if (column?.value) {
    data = column.value;
  } else if (column?.infoPath) {
    const strData: string = evaluateValue(
      entry,
      mappings[column.infoPath],
    ).replaceAll("<br/>", "\n");
    if (strData && column.applyToValue) {
      data = column.applyToValue(strData);
    } else {
      data = strData;
    }
  } else if (column?.evaluateEntry) {
    data = column.evaluateEntry(entry);
  } else {
    throw new Error(
      `No value or infoPath provided to EvaluateTable column: ${JSON.stringify(
        column,
      )}`,
    );
  }

  if (data && column.hiddenBaseText) {
    hiddenRow = data;
    hidden = true;
    data = column.hiddenBaseText;
  }

  return { data, hidden, hiddenRow };
};

export default EvaluateTable;
