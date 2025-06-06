"use client";
import React from "react";

import SortableHeader, {
  TableHeader,
} from "@/app/components/table/SortableHeader";
import { useQueryParam } from "@/app/hooks/useQueryParam";

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
   * @param direction - The direction to sort.
   */
  const handleSort = (columnId: string, direction: string) => {
    updateQueryParam("columnId", columnId);
    updateQueryParam("direction", direction);
    pushQueryUpdate();
  };

  return (
    <SortableHeader
      className="position-sticky top-0 z-100"
      headers={headers}
      disabled={disabled}
      handleSort={handleSort}
    />
  );
};
