"use client";

import { ReactNode } from "react";

import { Table } from "@trussworks/react-uswds";

import PaginationBar from "@/app/components/pagination/PaginationBar";
import { PAGE_SIZES } from "@/app/constants";

import { SortableHeader, TableHeader } from "./SortableHeader";
import { TableContentLoading } from "./TableContentLoading";

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
 * @param props.initHeaders Header specifiction
 * @param props.itemType Type of item being displayed
 * @returns client side paginated sortable table
 */
export const PaginatedSortableTableLoading = <T extends TableHeader>({
  itemType,
  initHeaders,
}: {
  itemType: string;
  initHeaders: T[];
}) => {
  return (
    <div>
      <Table bordered={false} className="width-full table-radius-md">
        <SortableHeader
          headers={initHeaders}
          disabled={true}
          handleSort={() => {}}
          // Because of the way uswds defines table styling, a classname on
          // the header doesn't take precedence. Hence the hardcoded style.
          style={{ paddingTop: "1.25rem" }}
        />

        <TableContentLoading numColumns={initHeaders.length} />
      </Table>

      <PaginationBar
        itemType={itemType}
        currentPage={0}
        totalCount={0}
        itemsPerPage={PAGE_SIZES[0]}
        onItemsPerPageHandler={() => {}}
        pathname=""
        onClickPrevious={() => {}}
        onClickNext={() => {}}
        onClickPageNumber={() => {}}
      />
    </div>
  );
};
