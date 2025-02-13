import React from "react";
import { Table } from "@trussworks/react-uswds";
import { SortButton } from "@/app/components/SortButton";
import { range } from "../utils/data-utils";
import classNames from "classnames";

type EcrTableStyledProps = {
  headers: Column[];
  handleSort: SortHandlerFn;
  children: React.ReactNode;
};

type Column = {
  id: string;
  value: string;
  className: string;
  dataSortable: boolean;
  sortDirection: string;
};

type SortHandlerFn = (columnId: string, direction: string) => void;

export const INITIAL_HEADERS = [
  {
    id: "patient",
    value: "Patient",
    className: "library-patient-column",
    dataSortable: true,
    sortDirection: "",
  },
  {
    id: "date_created",
    value: "Received Date",
    className: "library-received-date-column",
    dataSortable: true,
    sortDirection: "",
  },
  {
    id: "report_date",
    value: "Encounter Date",
    className: "library-encounter-date-column",
    dataSortable: true,
    sortDirection: "",
  },
  {
    id: "reportable_condition",
    value: "Reportable Condition",
    className: "library-condition-column",
    dataSortable: false,
    sortDirection: "",
  },
  {
    id: "rule_summary",
    value: "RCKMS Rule Summary",
    className: "library-rule-column",
    dataSortable: false,
    sortDirection: "",
  },
];

/**
 * The Ecr Library table, but with blobs instead of data.
 * @returns - The JSX element representing the eCR table.
 */
export const EcrTableLoading = () => {
  return (
    <EcrTableStyled headers={INITIAL_HEADERS} handleSort={() => {}}>
      {range(10).map((i) => {
        return (
          <BlobRow key={i} themeColor={i % 2 == 0 ? "gray" : "dark-gray"} />
        );
      })}
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
  column: Column;
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
            columnName={column.id}
            className={classNames({
              "sortable-asc-column": column.sortDirection === "ASC",
              "sortable-desc-column": column.sortDirection === "DESC",
              "sortable-column": column.sortDirection === "",
            })}
            direction={column.sortDirection}
            handleSort={handleSort}
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
