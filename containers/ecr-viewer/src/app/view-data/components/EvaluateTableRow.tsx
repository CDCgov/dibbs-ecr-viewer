"use client";
import { noData } from "@/app/utils/data-utils";
import { Button } from "@trussworks/react-uswds";
import React, { ReactNode, useId, useState } from "react";

interface TableRowData {
  rowCellsData: {
    data: ReactNode;
    hidden: boolean;
  }[];
  hiddenRow: ReactNode;
}

/**
 * Builds a row for a table based on provided columns, mappings, and entry data.
 * @param props - The properties object containing columns, mappings, and entry data.
 * @param props.tableRowData - An array of column objects defining the structure of the row.
 * @param props.numCols - An object containing mappings for column data.
 * @returns - The JSX element representing the constructed row.
 */
export const EvaluateTableRow = ({
  tableRowData,
  numCols,
}: {
  tableRowData: TableRowData;
  numCols: number;
}) => {
  const [hiddenComment, setHiddenComment] = useState(true);
  const id = useId();

  const { rowCellsData, hiddenRow } = tableRowData;

  if (rowCellsData.length === 0) return null;

  return (
    <>
      <tr>
        {rowCellsData.map(({ data, hidden }, index) => (
          <td key={`row-data-${index}`} className="text-top">
            {data ? (
              hidden ? (
                <Button
                  unstyled={true}
                  type="button"
                  onClick={() => setHiddenComment(!hiddenComment)}
                  aria-controls={`hidden-comment-${id}`}
                  aria-expanded={!hiddenComment}
                  data-test-id="comment-button"
                >
                  {hiddenComment ? "View" : "Hide"} {data}
                </Button>
              ) : (
                data
              )
            ) : (
              noData
            )}
          </td>
        ))}
      </tr>
      {hiddenRow && (
        <tr hidden={hiddenComment} id={`hidden-comment-${id}`}>
          <td colSpan={numCols} className="hideableData p-list">
            {hiddenRow}
          </td>
        </tr>
      )}
    </>
  );
};

export default EvaluateTableRow;
