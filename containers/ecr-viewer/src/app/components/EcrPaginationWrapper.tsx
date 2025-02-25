"use client";
import React, { ReactNode } from "react";
import Cookie from "js-cookie";
import { Label, Select } from "@trussworks/react-uswds";
import { Pagination } from "@/app/components/Pagination";
import { useQueryParam } from "@/app/hooks/useQueryParam";
import { PAGE_SIZES } from "@/app/constants";

interface EcrPaginationWrapperProps {
  totalCount: number;
  itemsPerPage: number;
  currentPage: number;
  children: ReactNode;
}

/**
 * Renders a list of eCR data with viewer.
 * @param props - The properties passed to the component.
 * @param props.totalCount - Total number of eCRs
 * @param props.currentPage - Current page index
 * @param props.itemsPerPage - Number of eCRs per page
 * @param props.children - Contents of the wrapper
 * @returns The JSX element (table) representing the rendered list of eCRs.
 */
const EcrPaginationWrapper = ({
  totalCount,
  currentPage,
  itemsPerPage,
  children,
}: EcrPaginationWrapperProps) => {
  const { updateQueryParam, pushQueryUpdate } = useQueryParam();

  const totalPages = totalCount > 0 ? Math.ceil(totalCount / itemsPerPage) : 1;

  const startIndex = totalCount > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;

  const endIndex = Math.min(currentPage * itemsPerPage, totalCount);

  // Make sure the pages includes the currently set one
  const pageSizes = [...new Set([...PAGE_SIZES, itemsPerPage])].sort(
    (a, b) => a - b,
  );

  return (
    <div className="main-container height-ecr-library flex-column flex-align-center">
      {children}
      <div className="pagination-bar width-full padding-x-3 padding-y-105 flex-align-self-stretch display-flex flex-align-center">
        <div className="flex-1">
          Showing {startIndex}-{endIndex} of {totalCount} eCRs
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          maxSlots={6}
          pathname=""
          className="flex-1"
        />
        <div className="display-flex flex-align-center flex-1 flex-justify-end">
          <Label
            htmlFor="input-select"
            className="margin-top-0 margin-right-1025"
          >
            eCRs per page
          </Label>
          <Select
            id="input-select"
            name="input-select"
            value={itemsPerPage.toString()}
            className="styled width-11075 margin-top-0"
            onChange={(e) => {
              const value = e.target.value;
              // Write the cookie for future visits
              Cookie.set("itemsPerPage", value, {
                expires: 1000,
              });

              updateQueryParam("itemsPerPage", value);
              pushQueryUpdate();
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
    </div>
  );
};

export default EcrPaginationWrapper;
