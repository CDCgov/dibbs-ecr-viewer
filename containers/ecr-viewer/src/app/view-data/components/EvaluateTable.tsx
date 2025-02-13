import { Element } from "fhir/r4";
import { PathMappings } from "@/app/utils/data-utils";
import { Table } from "@trussworks/react-uswds";
import classNames from "classnames";
import React, { ReactNode } from "react";
import { evaluateValue } from "../../services/evaluateFhirDataService";
import EvaluateTableRow from "./EvaluateTableRow";

export interface ColumnInfoInput {
  columnName: string;
  infoPath?: string;
  value?: string;
  className?: string;
  hiddenBaseText?: string;
  applyToValue?: (value: any) => any;
}

interface TableProps {
  resources: Element[];
  mappings: PathMappings;
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
 * @param props.mappings - An object containing the FHIR path mappings.
 * @param props.columns - An array of objects representing column information. The order of columns in the array determines the order of appearance.
 * @param props.caption - The caption for the table.
 * @param props.className - (Optional) Classnames to be applied to table.
 * @param props.fixed - Determines whether to fix the width of the table columns. Default is true.
 * @param props.outerBorder - Determines whether to include an outer border for the table. Default is true
 * @returns - A formatted table React element.
 */
const EvaluateTable = ({
  resources,
  mappings,
  columns,
  caption,
  className,
  fixed = true,
  outerBorder = true,
}: TableProps): React.JSX.Element => {
  return (
    <BaseTable
      columns={columns}
      caption={caption}
      className={className}
      fixed={fixed}
      outerBorder={outerBorder}
    >
      {resources.map((entry, index) => (
        <EvaluateTableRow
          key={index}
          tableRowData={evaluateTableRowData(columns, mappings, entry)}
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
  caption?: string;
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
          className={classNames("tableHeader", column.className)}
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
  mappings: PathMappings,
  entry: Element,
) => {
  let hiddenRow: ReactNode = null;
  let rowCellsData = columns.map((column) => {
    let data: ReactNode;
    let hidden = false;
    if (column?.value) {
      data = column.value;
    }

    if (!column?.value && column?.infoPath) {
      data = splitStringWith(
        evaluateValue(entry, mappings[column.infoPath]),
        "<br/>",
      );
    }

    if (data && column.applyToValue) {
      data = column.applyToValue(data);
    }

    if (data && column.hiddenBaseText) {
      hiddenRow = data;
      hidden = true;
      data = column.hiddenBaseText;
    }

    return { data, hidden };
  });

  // This row is entirely empty, skip it
  if (rowCellsData.every(({ data }) => !data))
    return { rowCellsData: [], hiddenRow };

  return { rowCellsData, hiddenRow };
};

const splitStringWith = (
  input: string,
  splitter: string,
): (string | JSX.Element)[] | string => {
  // Split the input string by <br/> tag
  const parts = input.split(splitter);

  // If there is no <br/> in the input string, return the string as a single element array
  if (parts.length === 1) {
    return input;
  }

  // Create an array with strings and JSX <br /> elements
  const result: (string | JSX.Element)[] = [];
  parts.forEach((part, index) => {
    result.push(<p key={`${part}-${index}`}>{part}</p>);
  });

  return result;
};

export default EvaluateTable;
