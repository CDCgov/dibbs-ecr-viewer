"use client";
import React from "react";

import { SortButton } from "./SortButton";

type StringKeys<T> = keyof T extends string ? keyof T : never;
type SortDirection = "ASC" | "DESC" | "";

export type TableHeader<T> = {
  id: StringKeys<T>;
  value: string;
  className: string;
  dataSortable: boolean;
  sortDirection: SortDirection;
};

export type SortHandlerFn = (
  columnId: string,
  direction: SortDirection,
) => void;

/**
 *
 * @param root0
 * @param root0.column
 * @param root0.disabled
 * @param root0.handleSort
 */
export const TableHeaderCell = <T,>({
  column,
  disabled,
  handleSort,
}: {
  column: TableHeader<T>;
  disabled: boolean;
  handleSort: SortHandlerFn;
}) => {
  return (
    <th
      id={`${column.id}-header`}
      role="columnheader"
      scope="col"
      className={column.className}
      data-sortable={column.dataSortable}
      aria-sort={getAriaSortValue(column.sortDirection)}
    >
      {column.sortDirection || column.dataSortable ? (
        <SortButton
          columnId={column.id}
          columnName={column.value}
          direction={column.sortDirection}
          disabled={disabled}
          handleSort={() => handleSort(column.id, column.sortDirection)}
        />
      ) : (
        <div className="display-flex">{column.value}</div>
      )}
    </th>
  );
};

type AriaSortType = "none" | "ascending" | "descending" | "other";

const getAriaSortValue = (sortDirection: string): AriaSortType | undefined => {
  if (sortDirection === "ASC") {
    return "ascending";
  } else if (sortDirection === "DESC") {
    return "descending";
  }
};

export default TableHeaderCell;
