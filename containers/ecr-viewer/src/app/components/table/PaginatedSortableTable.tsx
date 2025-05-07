"use client";

import { useState, ReactNode } from "react";

import { Table } from "@trussworks/react-uswds";

import { Pagination } from "@/app/components/Pagination";
import { noData } from "@/app/utils/data-utils";

import TableHeaderCell, { SortHandlerFn, TableHeader } from "./TableHeaderCell";

/**
 * A client side controlled paginated and sorted table. For use with smaller data.
 * @param root0
 * @param root0.items
 * @param root0.initHeaders
 */
export const PaginatedSortableTable = <
  T extends { uuid: string; [k: string]: ReactNode },
>({
  items,
  initHeaders,
}: {
  items: T[];
  initHeaders: TableHeader<T>[];
}) => {
  const [tableHeaders, setTableHeaders] = useState(initHeaders);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [page, setPage] = useState(1);

  const numItems = items.length;
  const totalPages = numItems > 0 ? Math.ceil(numItems / itemsPerPage) : 1;
  const startIndex = numItems > 0 ? (page - 1) * itemsPerPage + 1 : 0;
  const endIndex = Math.min(page * itemsPerPage, numItems);

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
      <Table bordered={false}>
        <SortableHeader headers={tableHeaders} setHeaders={setTableHeaders} />

        <tbody>
          {sortedItems.slice(startIndex, endIndex).map((item) => (
            <tr key={item.uuid}>
              {initHeaders.map(({ id }) => (
                <td key={id}>{item[id] || noData}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        pathname=""
        onClickPrevious={() => setPage(page - 1)}
        onClickNext={() => setPage(page + 1)}
        onClickPageNumber={(_e, p) => setPage(p)}
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
  const handleSort: SortHandlerFn = (columnId, direction) =>
    setHeaders(
      headers.map((h) => ({
        ...h,
        sortDirection: h.id === columnId ? direction : "",
      })),
    );

  return (
    <thead className="position-sticky top-0">
      <tr>
        {headers.map((column) => (
          <TableHeaderCell
            key={column.id}
            column={column}
            handleSort={handleSort}
            disabled={false}
          />
        ))}
      </tr>
    </thead>
  );
};
