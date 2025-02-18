import {
  HtmlTableJson,
  HtmlTableJsonRow,
} from "@/app/services/htmlTableService";
import { noData } from "@/app/utils/data-utils";
import classNames from "classnames";
import { BaseTable, ColumnInfoInput } from "./EvaluateTable";
import { ToolTipElement } from "./ToolTipElement";

interface JsonTableProps {
  jsonTableData: HtmlTableJson;
  captionToolTip?: string;
  captionIsTitle?: boolean;
  outerBorder?: boolean;
  className?: string;
}
/**
 * Returns a table built from a JSON representation of the XHTML in the FHIR data.
 * @param props - props passed to the React component
 * @param props.jsonTableData - A table represented as JSON
 * @param props.captionToolTip - A tooltip string to add to the table's caption (resultName)
 * @param props.captionIsTitle - The caption should be styled as a title for the table
 * @param props.outerBorder - Determines whether to include an outer border for the table. Default is true.
 * @param props.className - Classnames to be applied to table.
 * @returns A table or null, depending on whether or not there are tables to display.
 */
export const JsonTable = ({
  jsonTableData,
  captionToolTip,
  captionIsTitle = false,
  outerBorder = true,
  className = "",
}: JsonTableProps): JSX.Element | null => {
  const { resultName, tables } = jsonTableData;
  const flattenedTable = tables?.flat() ?? [];
  const columns = useConstructColumns(flattenedTable);

  if (!columns) {
    return null;
  }

  let caption: string | React.ReactNode = resultName;
  if (captionIsTitle) {
    caption = <div className="data-title">{caption}</div>;
  }
  if (captionToolTip) {
    caption = (
      <ToolTipElement toolTip={captionToolTip}>{caption}</ToolTipElement>
    );
  }

  return (
    <BaseTable
      columns={columns}
      caption={caption}
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
  flattenedTable: HtmlTableJsonRow[],
): ColumnInfoInput[] | null {
  if (flattenedTable.length > 0) {
    return Object.keys(flattenedTable[0]).map((columnName) => ({
      columnName,
      className: "bg-gray-5 minw-10",
    }));
  }

  return null;
}
