"use client";
import React from "react";
import { Table } from "@trussworks/react-uswds";
import { SortButton } from "@/app/components/SortButton";
import { range } from "../utils/data-utils";
import classNames from "classnames";

type EcrTableStyledProps = {
  headers: TableHeader[];
  handleSort: SortHandlerFn;
  children: React.ReactNode;
};

export type TableHeader = {
  id: string;
  value: string;
  className: string;
  dataSortable: boolean;
  sortDirection: string;
};

type SortHandlerFn = (columnId: string, direction: string) => void;

/**
 * The Ecr Library table, but with blobs instead of data.
 * @param props - react props
 * @param props.headers - header descriptions
 * @returns - The JSX element representing the eCR table.
 */
export const EcrTableLoading = ({ headers }: { headers: TableHeader[] }) => {
  return (
    <EcrTableStyled headers={headers} handleSort={() => {}}>
      {range(10).map((i) => {
        return (
          <BlobRow key={i} themeColor={i % 2 == 0 ? "gray" : "dark-gray"} />
        );
      })}
    </EcrTableStyled>
  );
};

/**
 * The Ecr Library table, but with a no data message instead of rows.
 * @param props - react props
 * @param props.headers - header descriptions
 * @returns - The JSX element representing the eCR table.
 */
export const EcrTableNoData = ({ headers }: { headers: TableHeader[] }) => {
  return (
    <EcrTableStyled headers={headers} handleSort={() => {}}>
      <tr>
        <td
          colSpan={headers.length}
          className="text-middle text-center height-card"
        >
          <span className="text-bold font-body-lg">
            No eCRs found. We couldn't find any eCRs matching your filter or
            search critera.
          </span>
        </td>
      </tr>
    </EcrTableStyled>
  );
};

/**
 * The Ecr Library table layout.
 * @param props - react props
 * @param props.headers - header descriptions
 * @param props.handleSort - handler when sort changes
 * @param props.children - body of the table
 * @returns - The JSX element representing the eCR table.
 */
export const EcrTableStyled: React.FC<EcrTableStyledProps> = ({
  headers,
  handleSort,
  children,
}) => {
  return (
    <div className="ecr-library-wrapper width-full overflow-auto">
      <Table
        bordered={false}
        fullWidth={true}
        striped={true}
        fixed={true}
        className={"table-ecr-library margin-0"}
        data-testid="table"
      >
        <thead className={"position-sticky top-0"}>
          <tr>
            {headers.map((column) => (
              <Header key={column.id} column={column} handleSort={handleSort} />
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </Table>
    </div>
  );
};

const Header = ({
  column,
  handleSort,
}: {
  column: TableHeader;
  handleSort: SortHandlerFn;
}) => {
  return (
    <th
      id={`${column.id}-header`}
      key={`${column.value}`}
      scope="col"
      role="columnheader"
      className={column.className}
      data-sortable={column.dataSortable}
      aria-sort={getAriaSortValue(column.sortDirection)}
    >
      <div className={column.sortDirection ? "sort-div" : "display-flex"}>
        {column.value}
        {(column.sortDirection || column.dataSortable) && (
          <SortButton
            columnId={column.id}
            columnName={column.value}
            className={classNames({
              "sortable-asc-column": column.sortDirection === "ASC",
              "sortable-desc-column": column.sortDirection === "DESC",
              "sortable-column": column.sortDirection === "",
            })}
            direction={column.sortDirection}
            handleSort={() => handleSort(column.id, column.sortDirection)}
          ></SortButton>
        )}
      </div>
    </th>
  );
};

type AriaSortType = "none" | "ascending" | "descending" | "other";

const getAriaSortValue = (sortDirection: string): AriaSortType | undefined => {
  if (sortDirection === "ASC") {
    return "ascending";
  } else if (sortDirection === "DESC") {
    return "descending";
  }
};

const Blob = ({ themeColor }: { themeColor: string }) => {
  return (
    <div className="grid-row">
      <div
        className={`loading-blob grid-col-8 loading-blob-${themeColor} width-full`}
      >
        &nbsp;
      </div>
    </div>
  );
};

const BlobRow = ({ themeColor }: { themeColor: string }) => {
  return (
    <tr>
      <td>
        <Blob themeColor={themeColor} />
      </td>
      <td>
        <Blob themeColor={themeColor} />
        <br />
        <Blob themeColor={themeColor} />
      </td>
      <td>
        <Blob themeColor={themeColor} />
        <br />
        <Blob themeColor={themeColor} />
      </td>
      <td>
        <Blob themeColor={themeColor} />
      </td>
      <td>
        <Blob themeColor={themeColor} />
      </td>
    </tr>
  );
};
