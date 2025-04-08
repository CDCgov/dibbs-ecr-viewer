import React from "react";

import { LayoutGroup } from "motion/react";

import { listEcrData } from "@/app/services/listEcrDataService";
import { DateRangePeriod } from "@/app/utils/date-utils";

import { EcrTableDataRow } from "./EcrTableDataRow";

/**
 * eCR Table
 * @param props - The properties passed to the component.
 * @param props.currentPage - The current page to be displayed
 * @param props.itemsPerPage - The number of items to be displayed in the table
 * @param props.totalEcrCount - The total number of eCRs that match these criteria
 * @param props.sortColumn - The column to sort by
 * @param props.sortDirection - The direction to sort by
 * @param props.filterDates - The date range used to filter data
 * @param props.searchTerm - The search term used to list data
 * @param props.filterConditions - (Optional) The reportable condition(s) used to filter the data
 * @returns - eCR Table element
 */
const EcrTableContent = async ({
  currentPage,
  itemsPerPage,
  totalEcrCount,
  sortColumn,
  sortDirection,
  searchTerm,
  filterConditions,
  filterDates,
}: {
  currentPage: number;
  itemsPerPage: number;
  totalEcrCount: number;
  sortColumn: string;
  sortDirection: string;
  filterDates: DateRangePeriod;
  searchTerm?: string;
  filterConditions?: string[];
}) => {
  const startIndex = (currentPage - 1) * itemsPerPage;

  const data = await listEcrData(
    startIndex,
    itemsPerPage,
    sortColumn,
    sortDirection,
    filterDates,
    searchTerm,
    filterConditions,
  );

  return (
    <LayoutGroup>
      <tbody>
        {data.map((item, index) => (
          <EcrTableDataRow
            key={index}
            item={item}
            numEcrs={totalEcrCount}
            index={(currentPage - 1) * itemsPerPage + index}
          />
        ))}
      </tbody>
    </LayoutGroup>
  );
};

export default EcrTableContent;
