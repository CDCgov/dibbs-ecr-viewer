"use client";

import { useState, ReactNode } from "react";

import { Label, Select, Table } from "@trussworks/react-uswds";

import { Pagination } from "@/app/components/Pagination";
import { PAGE_SIZES } from "@/app/constants";
import { noData } from "@/app/utils/data-utils";

import TableHeaderCell, { SortHandlerFn, TableHeader } from "./TableHeaderCell";

/**
 * A client side controlled paginated and sorted table. For use with smaller data.
 * @param root0
 * @param root0.items
 * @param root0.initHeaders
 * @param root0.itemType
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
      <div className="width-full padding-x-3 padding-y-105 flex-align-self-stretch display-flex flex-align-center">
        <div className="flex-1">
          Showing {startIndex}-{endIndex} of {numItems} {itemType}
        </div>
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          pathname=""
          onClickPrevious={() => setPage(page - 1)}
          onClickNext={() => setPage(page + 1)}
          onClickPageNumber={(_e, p) => setPage(p)}
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
              const value = e.target.value;
              setItemsPerPage(Number(value));
            }}
          >
            {PAGE_SIZES.map((size) => (
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
            key={column.id}
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
