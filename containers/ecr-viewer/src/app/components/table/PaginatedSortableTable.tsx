"use client";

import { useState, ReactNode } from "react";

import { Table } from "@trussworks/react-uswds";

import { PAGE_SIZES } from "@/app/constants";
import { noData } from "@/app/utils/data-utils";

import PaginationBar from "./PaginationBar";
import TableHeaderCell, { SortHandlerFn, TableHeader } from "./TableHeaderCell";

/**
 * A client side controlled paginated and sorted table. For use with smaller data.
 * @param props React Props
 * @param props.items Items to fill table rows
 * @param props.initHeaders Header specifiction
 * @param props.itemType Type of item being displayed
 * @returns client side paginated sortable table
 */
export const PaginatedSortableTable = <
  T extends { uuid: string; [k: string]: ReactNode },
>({
  items,
  itemType,
  initHeaders,
}: {
  items: T[];
  itemType: string;
  initHeaders: TableHeader<T>[];
}) => {
  const [tableHeaders, setTableHeaders] = useState(initHeaders);
  const [itemsPerPage, setItemsPerPage] = useState(PAGE_SIZES[0]);
  const [page, setPage] = useState(1);

  const numItems = items.length;
  const totalPages = numItems > 0 ? Math.ceil(numItems / itemsPerPage) : 1;
  const startIndex = numItems > 0 ? (page - 1) * itemsPerPage + 1 : 0;
  const endIndex = Math.min(page * itemsPerPage, numItems);

  console.log({ numItems, totalPages, startIndex, endIndex });
  // maybe memo this?
  const sortColumn = tableHeaders.find(({ sortDirection }) => !!sortDirection);
  const sortedItems = [...items];
  if (!!sortColumn) {
    sortedItems.sort((a, b) => {
      const diff = (a[sortColumn.id] || "") < (b[sortColumn.id] || "") ? 1 : -1;
      return sortColumn.sortDirection === "ASC" ? diff : diff * -1;
    });
  }

  return (
    <div>
      <Table bordered={false} className="width-full table-radius-md">
        <SortableHeader headers={tableHeaders} setHeaders={setTableHeaders} />

        <tbody>
          {sortedItems.slice(startIndex - 1, endIndex).map((item) => (
            <tr key={item.uuid}>
              {initHeaders.map(({ id }) => (
                <td key={id}>{item[id] || noData}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
      <PaginationBar
        itemType={itemType}
        currentPage={page}
        totalCount={numItems}
        itemsPerPage={itemsPerPage}
        onItemsPerPageHandler={(value) => setItemsPerPage(Number(value))}
        paginationProps={{
          pathname: "",
          onClickPrevious: () => setPage(page - 1),
          onClickNext: () => setPage(page + 1),
          onClickPageNumber: (_e, p) => setPage(p),
        }}
      />
    </div>
  );
};

const SortableHeader = <T,>({
  headers,
  setHeaders,
}: {
  headers: TableHeader<T>[];
  setHeaders: (h: TableHeader<T>[]) => void;
}) => {
  const handleSort: SortHandlerFn = (columnId, direction) => {
    console.log({ columnId, direction });
    setHeaders(
      headers.map((h) => ({
        ...h,
        sortDirection: h.id === columnId ? direction : "",
      })),
    );
  };
  return (
    <thead>
      <tr>
        {headers.map((column) => (
          <TableHeaderCell
            key={column.id + column.sortDirection}
            column={column}
            handleSort={handleSort}
            disabled={false}
            style={{ paddingTop: "1.25rem" }}
          />
        ))}
      </tr>
    </thead>
  );
};
