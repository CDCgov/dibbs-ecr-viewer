import React from "react";
import { listEcrData } from "@/app/services/listEcrDataService";
import { EcrTableClient } from "@/app/components/EcrTableClient";
import {
  EcrTableNoData,
  TableHeader,
} from "@/app/components/EcrTableClientBase";
import { DateRangePeriod } from "@/app/utils/date-utils";

/**
 * eCR Table
 * @param props - The properties passed to the component.
 * @param props.currentPage - The current page to be displayed
 * @param props.itemsPerPage - The number of items to be displayed in the table
 * @param props.sortColumn - The column to sort by
 * @param props.sortDirection - The direction to sort by
 * @param props.filterDates - The date range used to filter data
 * @param props.searchTerm - The search term used to list data
 * @param props.filterConditions - (Optional) The reportable condition(s) used to filter the data
 * @param props.headers - Table headers descriptions
 * @returns - eCR Table element
 */
const EcrTable = async ({
  currentPage,
  itemsPerPage,
  sortColumn,
  sortDirection,
  searchTerm,
  filterConditions,
  filterDates,
  headers,
}: {
  currentPage: number;
  itemsPerPage: number;
  sortColumn: string;
  sortDirection: string;
  filterDates: DateRangePeriod;
  searchTerm?: string;
  filterConditions?: string[];
  headers: TableHeader[];
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

  if (data.length === 0) {
    return <EcrTableNoData headers={headers} />;
  }

  return <EcrTableClient headers={headers} data={data} />;
};

export default EcrTable;
