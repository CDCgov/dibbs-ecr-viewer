"use client";

import { Label, Select } from "@trussworks/react-uswds";
import React, { ReactNode, useEffect, useState } from "react";
import { Pagination } from "@/app/components/Pagination";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface EcrPaginationWrapperProps {
  totalCount: number;
  children: ReactNode;
}

interface UserPreferences {
  itemsPerPage: number;
}

const defaultPreferences = {
  itemsPerPage: 25,
};

/**
 * Renders a list of eCR data with viewer.
 * @param props - The properties passed to the component.
 * @param props.totalCount - Total number of eCRs
 * @param props.children - Contents of the wrapper
 * @returns The JSX element (table) representing the rendered list of eCRs.
 */
const EcrPaginationWrapper = ({
  totalCount,
  children,
}: EcrPaginationWrapperProps) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const currentPage = Number(searchParams.get("page")) || 1;
  const [userPreferences, setUserPreferences] =
    useState<UserPreferences>(defaultPreferences);

  useEffect(() => {
    const userPreferencesString = localStorage.getItem("userPreferences");
    if (userPreferencesString) {
      const storedPrefs = JSON.parse(userPreferencesString);
      setUserPreferences({ ...defaultPreferences, ...storedPrefs });
    }
  }, []);

  useEffect(() => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    current.set("itemsPerPage", userPreferences.itemsPerPage.toString());
    const search = current.toString();
    const query = search ? `?${search}` : "";
    router.push(`${pathname}${query}`);
  }, [userPreferences]);

  const totalPages =
    totalCount > 0 ? Math.ceil(totalCount / userPreferences.itemsPerPage) : 1;

  const startIndex =
    totalCount > 0 ? (currentPage - 1) * userPreferences.itemsPerPage + 1 : 0;

  const endIndex = Math.min(
    currentPage * userPreferences.itemsPerPage,
    totalCount,
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
            value={userPreferences.itemsPerPage}
            className="styled width-11075 margin-top-0"
            onChange={(e) => {
              const updatedUserPreferences: UserPreferences = {
                ...userPreferences,
                itemsPerPage: +e.target.value,
              };
              setUserPreferences(updatedUserPreferences);
              localStorage.setItem(
                "userPreferences",
                JSON.stringify(updatedUserPreferences),
              );
            }}
          >
            <React.Fragment>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="75">75</option>
              <option value="100">100</option>
            </React.Fragment>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default EcrPaginationWrapper;
