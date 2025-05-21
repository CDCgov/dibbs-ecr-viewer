"use client";
import React from "react";

import { Label, Select } from "@trussworks/react-uswds";
import classnames from "classnames";

import { PAGE_SIZES } from "@/app/constants";
import { toUnSentenceCase } from "@/app/utils/format-utils";

import { Pagination, PaginationProps } from "./Pagination";

interface PaginationBarProps extends PaginationProps {
  totalCount: number;
  itemsPerPage: number;
  itemType: string;
  classNames?: string;
  onItemsPerPageHandler: (v: string) => void;
}

/**
 * Renders a list of eCR data with viewer.
 * @param props - The properties passed to the component.
 * @param props.totalCount - Total number of items
 * @param props.currentPage - Current page index
 * @param props.itemsPerPage - Number of items per page
 * @param props.itemType - Type of item being paginated in plural uppercased form
 * @param props.onItemsPerPageHandler - Handler when items per page changes
 * @param props.paginationProps - Props passed on to `Pagination` component
 * @param props.classNames - classnames to apply to the outer div
 * @returns The JSX element (table) representing the rendered list of eCRs.
 */
const PaginationBar = ({
  totalCount,
  currentPage,
  itemsPerPage,
  itemType,
  onItemsPerPageHandler,
  classNames,
  ...paginationProps
}: PaginationBarProps) => {
  const totalPages = totalCount > 0 ? Math.ceil(totalCount / itemsPerPage) : 1;
  const startIndex = totalCount > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endIndex = Math.min(currentPage * itemsPerPage, totalCount);

  // Make sure the pages includes the currently set one
  const pageSizes = [...new Set([...PAGE_SIZES, itemsPerPage])].sort(
    (a, b) => a - b,
  );

  return (
    <div
      className={classnames(
        "pagination-bar width-full padding-x-3 padding-y-105 flex-align-self-stretch display-flex flex-align-center",
        classNames,
      )}
    >
      <div className="flex-1">
        Showing {startIndex}-{endIndex} of {totalCount}{" "}
        {toUnSentenceCase(itemType)}
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        maxSlots={6}
        className="flex-1"
        {...paginationProps}
      />
      <div className="display-flex flex-align-center flex-1 flex-justify-end">
        <Label
          htmlFor="input-select"
          className="margin-top-0 margin-right-1025"
        >
          {itemType} per page
        </Label>
        <Select
          id="input-select"
          name="input-select"
          value={itemsPerPage.toString()}
          className="styled width-11075 margin-top-0"
          onChange={(e) => {
            onItemsPerPageHandler(e.target.value);
          }}
        >
          {pageSizes.map((size) => (
            <option value={size.toString()} key={size}>
              {size}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
};

export default PaginationBar;
