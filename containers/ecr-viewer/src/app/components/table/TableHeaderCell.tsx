"use client";
import React from "react";

import { SortButton } from "./SortButton";

type StringKeys<T> = Extract<keyof T, string>;
export type SortDirection = "ASC" | "DESC" | "";

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
 * Header cell in a table
 * @param props React Props
 * @param props.column Column specification
 * @param props.disabled Whether the sort button is disabled
 * @param props.handleSort Handler when sort button is clicked
 * @param props.style element style for the `th`
 * @returns table header cell component
 */
export const TableHeaderCell = <T,>({
  column,
  disabled,
  handleSort,
  style,
}: {
  column: TableHeader<T>;
  disabled: boolean;
  handleSort: SortHandlerFn;
  style?: Record<string, string>;
}) => {
  return (
    <th
      id={`${column.id}-header`}
      role="columnheader"
      scope="col"
      className={column.className}
      style={style}
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
