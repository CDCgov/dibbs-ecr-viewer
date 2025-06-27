"use client";
import React, { ReactNode } from "react";

import Cookies from "js-cookie";

import PaginationBar from "@/app/components/pagination/PaginationBar";
import { useLibraryQueryParam } from "@/app/hooks/useQueryParam";

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
  const { updateQueryParam, pushQueryUpdate } = useLibraryQueryParam();

  return (
    <div className="main-container flex-column flex-align-center flex-1 bg-white">
      {children}
      <PaginationBar
        currentPage={currentPage}
        totalCount={totalCount}
        itemsPerPage={itemsPerPage}
        itemType="eCRs"
        classNames="ecr-pagination-drop-shadow bg-white"
        onItemsPerPageHandler={(value) => {
          // Write the cookie for future visits
          Cookies.set("itemsPerPage", value, {
            expires: 1000,
          });

          updateQueryParam("itemsPerPage", value);
          pushQueryUpdate();
        }}
        pathname=""
      />
    </div>
  );
};

export default EcrPaginationWrapper;
