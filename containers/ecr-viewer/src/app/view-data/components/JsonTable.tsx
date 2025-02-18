import { HtmlTableJson, TableRow } from "@/app/services/htmlTableService";
import { noData } from "@/app/utils/data-utils";
import classNames from "classnames";
import { BaseTable, ColumnInfoInput } from "./EvaluateTable";

interface JsonTableProps {
  jsonTableData: HtmlTableJson;
  outerBorder?: boolean;
  className?: string;
}
/**
 * Returns a table built from a JSON representation of the XHTML in the FHIR data.
 * @param props - props passed to the React component
 * @param props.jsonTableData - A table represented as JSON
 * @param props.outerBorder - Determines whether to include an outer border for the table. Default is true.
 * @param props.className - Classnames to be applied to table.
 * @returns A table or null, depending on whether or not there are tables to display.
 */
export const JsonTable = ({
  jsonTableData,
  outerBorder = true,
  className = "",
}: JsonTableProps): JSX.Element | null => {
  const { resultName, tables } = jsonTableData;
  const flattenedTable = tables?.flat() ?? [];
  const columns = useConstructColumns(flattenedTable);

  if (!columns) {
    return null;
  }

  return (
    <BaseTable
      columns={columns}
      caption={resultName}
      className={classNames("caption-normal-weight margin-bottom-2", className)}
      fixed={false}
      outerBorder={outerBorder}
    >
      {flattenedTable.map((row, i) => (
        <tr key={`table-row-${i}`}>
          {Object.values(row).map(({ value }, j) => (
            <td key={`table-col-${j}`}>{value ?? noData}</td>
          ))}
        </tr>
      ))}
    </BaseTable>
  );
};

function useConstructColumns(
  flattenedTable: TableRow[],
): ColumnInfoInput[] | null {
  if (flattenedTable.length > 0) {
    return Object.keys(flattenedTable[0]).map((columnName) => ({
      columnName,
      className: "bg-gray-5 minw-10",
    }));
  }

  return null;
}
