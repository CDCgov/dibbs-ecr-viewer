"use client";

import { useState, ReactNode } from "react";

import { Table } from "@trussworks/react-uswds";
import Cookies from "js-cookie";

import PaginationBar from "@/app/components/pagination/PaginationBar";
import { PAGE_SIZES } from "@/app/constants";
import { noData } from "@/app/utils/data-utils";
import { stringSort } from "@/app/utils/format-utils";

import { NoDataRow } from "./NoDataRow";
import { SortDirection, SortableHeader, TableHeader } from "./SortableHeader";

// Object keys in javascript can be `string | number | symbol`, but the `id`
// field requires a `string`, so we need to limit the `keyof` to only the
// string ones or typescript gets mad
type StringKeys<T> = Extract<keyof T, string>;

export interface TableColumn<T> extends TableHeader {
  id: StringKeys<T>;
  // Can't express that val needs to be T[id] in typescript (yet?)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formatter?: (val: any, item: T) => ReactNode;
}

/**
 * A client side controlled paginated and sorted table. For use with smaller data.
 * @param props React Props
 * @param props.items Items to fill table rows
 * @param props.initHeaders Header specification
 * @param props.itemType Type of item being displayed
 * @returns client side paginated sortable table
 */
export const PaginatedSortableTable = <T extends { uuid: string }>({
  items,
  itemType,
  initHeaders,
}: {
  items: T[];
  itemType: string;
  initHeaders: TableColumn<T>[];
}) => {
  const [tableHeaders, setTableHeaders] = useState(initHeaders);
  const [itemsPerPage, setItemsPerPage] = useState(
    Number(Cookies.get("itemsPerPage")) || PAGE_SIZES[0],
  );
  const [page, setPage] = useState(1);

  const numItems = items.length;
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = Math.min(page * itemsPerPage, numItems);

  const sortColumn = tableHeaders.find(({ sortDirection }) => !!sortDirection);
  const sortedItems = [...items];
  if (!!sortColumn) {
    sortedItems.sort((a, b) => {
      const aVal = a[sortColumn.id] || "";
      const bVal = b[sortColumn.id] || "";
      const diff =
        typeof aVal === "string" && typeof bVal === "string"
          ? stringSort(aVal, bVal)
          : aVal < bVal
            ? -1
            : 1;
      return sortColumn.sortDirection === "ASC" ? diff : diff * -1;
    });
  }

  return (
    <div>
      <Table bordered={false} className="width-full table-radius-md">
        <SortableHeader
          headers={tableHeaders}
          handleSort={(columnId: string, direction: SortDirection) =>
            setTableHeaders(
              tableHeaders.map((h) => ({
                ...h,
                sortDirection: h.id === columnId ? direction : "",
              })),
            )
          }
          // Because of the way uswds defines table styling, a classname on
          // the header doesn't take precedence. Hence the hardcoded style.
          style={{ paddingTop: "1.25rem" }}
        />

        <tbody>
          {sortedItems.length > 0 ? (
            sortedItems.slice(startIndex, endIndex).map((item) => (
              <tr key={item.uuid}>
                {initHeaders.map(({ id, formatter = (v) => v }) => (
                  <td key={id} className="overflow-wrap-anywhere">
                    {formatter(item[id], item) || noData}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <NoDataRow>
              No {itemType.toLowerCase()} found. We couldn't find any{" "}
              {itemType.toLowerCase()} matching your filter criteria.
            </NoDataRow>
          )}
        </tbody>
      </Table>

      <PaginationBar
        itemType={itemType}
        currentPage={page}
        totalCount={numItems}
        itemsPerPage={itemsPerPage}
        onItemsPerPageHandler={(value) => {
          // Write the cookie for future visits
          Cookies.set("itemsPerPage", value, {
            expires: 1000,
          });

          setItemsPerPage(Number(value));
        }}
        pathname=""
        onClickPrevious={() => setPage(page - 1)}
        onClickNext={() => setPage(page + 1)}
        onClickPageNumber={(_e, p) => setPage(p)}
      />
    </div>
  );
};
