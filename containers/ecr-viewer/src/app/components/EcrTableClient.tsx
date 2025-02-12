"use client";
import React from "react";
import { Table } from "@trussworks/react-uswds";
import { SortButton } from "@/app/components/SortButton";
import { EcrDisplay } from "@/app/services/listEcrDataService";
import { toSentenceCase } from "@/app/services/formatService";
import { useQueryParam } from "@/app/hooks/useQueryParam";
import { noData, range } from "../view-data/utils/utils";
import classNames from "classnames";
import Link from "next/link";
import { saveToSessionStorage } from "./utils";

type EcrTableClientProps = {
  data: EcrDisplay[];
  sortColumn: string;
  sortDirection: string;
};

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

const initialHeaders = [
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
 *
 * @param props - The properties passed to the component.
 * @param props.data  - The data to be displayed in the table.
 * @param props.sortColumn - The column to sort by.
 * @param props.sortDirection - The direction to sort by.
 * @returns - The JSX element representing the eCR table.
 */
export const EcrTableClient: React.FC<EcrTableClientProps> = ({
  data,
  sortColumn,
  sortDirection,
}) => {
  const { updateQueryParam, pushQueryUpdate } = useQueryParam();

  const headers = initialHeaders.map((header) => {
    return {
      ...header,
      sortDirection: header.id === sortColumn ? sortDirection : "",
    };
  });

  /**
   * Handles sorting the table data by a given column. We update the search params,
   * which triggers a re-render of this component with the updated props when the
   * page gets the new search params.
   * @param columnId - The ID of the column to sort by.
   * @param curDirection - The current direction of sort.
   */
  const handleSort = (columnId: string, curDirection: string) => {
    // Flip the sort from the current direction, ASC is default
    const direction = curDirection === "ASC" ? "DESC" : "ASC";

    updateQueryParam("columnId", columnId);
    updateQueryParam("direction", direction);
    pushQueryUpdate();
  };

  return (
    <EcrTableStyled headers={headers} handleSort={handleSort}>
      {data.map((item, index) => (
        <DataRow key={index} item={item} />
      ))}
    </EcrTableStyled>
  );
};

/**
 * The Ecr Library table, but with blobs instead of data.
 * @returns - The JSX element representing the eCR table.
 */
export const EcrTableLoading = () => {
  return (
    <EcrTableStyled headers={initialHeaders} handleSort={() => {}}>
      {range(10).map((i) => {
        return (
          <BlobRow key={i} themeColor={i % 2 == 0 ? "gray" : "dark-gray"} />
        );
      })}
    </EcrTableStyled>
  );
};

// EcrTable without any logic or state.
const EcrTableStyled: React.FC<EcrTableStyledProps> = ({
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

/**
 * Formats a single row of the eCR table.
 * @param props - The properties passed to the component.
 * @param props.item - The eCR data to be formatted.
 * @returns A JSX table row element representing the eCR data.
 */
const DataRow = ({ item }: { item: EcrDisplay }) => {
  const patient_first_name = toSentenceCase(item.patient_first_name);
  const patient_last_name = toSentenceCase(item.patient_last_name);

  const { searchParams } = useQueryParam();

  const conditionsList = (
    <ul className="ecr-table-list">
      {item.reportable_conditions.map((rc, index) => (
        <li key={index}>{rc}</li>
      ))}
    </ul>
  );

  const summariesList = (
    <ul className="ecr-table-list">
      {item.rule_summaries.map((rs, index) => (
        <li key={index}>{rs}</li>
      ))}
    </ul>
  );
  const saveUrl = () => {
    saveToSessionStorage("urlParams", searchParams.toString());
  };

  return (
    <tr>
      <td>
        <Link onClick={saveUrl} href={`/view-data?id=${item.ecrId}`}>
          {patient_first_name} {patient_last_name}
        </Link>
        {item.eicr_version_number && (
          <span className="usa-tag margin-x-1 padding-x-05 padding-y-2px bg-primary-lighter radius-md text-thin text-base-dark">
            V{item.eicr_version_number}
          </span>
        )}
        <br />
        DOB: {item.patient_date_of_birth}
      </td>
      <td>{item.date_created}</td>
      <td>{item.patient_report_date || noData}</td>
      <td>{conditionsList}</td>
      <td>{summariesList}</td>
    </tr>
  );
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
