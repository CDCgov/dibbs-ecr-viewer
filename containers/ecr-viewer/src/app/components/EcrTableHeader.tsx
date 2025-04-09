"use client";
import React from "react";

import { useQueryParam } from "@/app/hooks/useQueryParam";

import { SortButton } from "./SortButton";

export type TableHeader = {
  id: string;
  value: string;
  className: string;
  dataSortable: boolean;
  sortDirection: string;
};

/**
 * Interactive header for the ecr library table
 * @param params react params
 * @param params.headers header descriptions
 * @param params.disabled whether to disable the sort functionality
 * @returns Interactive header row
 */
export const EcrTableHeader = ({
  headers,
  disabled,
}: {
  headers: TableHeader[];
  disabled: boolean;
}) => {
  const { updateQueryParam, pushQueryUpdate } = useQueryParam();

  /**
   * Handles sorting the table data by a given column. We update the search params,
   * which triggers a re-render of this component with the updated props when the
   * page gets the new search params.
   * @param columnId - The ID of the column to sort by.
   * @param curDirection - The current direction of sort.
   */
  const handleSort = (columnId: string, curDirection: string) => {
    // Flip the sort from the current direction, ASC is default
    const direction = curDirection === "ASC" ? "DESC" : "ASC";

    updateQueryParam("columnId", columnId);
    updateQueryParam("direction", direction);
    pushQueryUpdate();
  };

  return (
    <thead className="position-sticky top-0">
      <tr>
        {headers.map((column) => (
          <Header
            key={column.id}
            column={column}
            handleSort={handleSort}
            disabled={disabled}
          />
        ))}
      </tr>
    </thead>
  );
};

type SortHandlerFn = (columnId: string, direction: string) => void;

const Header = ({
  column,
  disabled,
  handleSort,
}: {
  column: TableHeader;
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

export default EcrTableHeader;
