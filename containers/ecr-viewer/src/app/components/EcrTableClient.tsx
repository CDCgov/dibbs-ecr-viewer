"use client";
import React from "react";
import { EcrDisplay } from "@/app/services/listEcrDataService";
import { toSentenceCase } from "@/app/utils/format-utils";
import { useQueryParam } from "@/app/hooks/useQueryParam";
import { noData } from "../utils/data-utils";
import Link from "next/link";
import { saveToSessionStorage } from "../utils/storage-utils";
import { EcrTableStyled, INITIAL_HEADERS } from "./EcrTableClientBase";

type EcrTableClientProps = {
  data: EcrDisplay[];
  sortColumn: string;
  sortDirection: string;
};

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

  const headers = INITIAL_HEADERS.map((header) => {
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
        <Link onClick={saveUrl} href={`/view-data/${item.ecrId}`}>
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
