"use client";
import React from "react";
import Link from "next/link";
import { toSentenceCase } from "../utils/format-utils";
import { saveToSessionStorage } from "../utils/storage-utils";
import { noData } from "../utils/data-utils";
import { useQueryParam } from "../hooks/useQueryParam";
import { EcrDisplay } from "../services/listEcrDataService";

/**
 * Data rows for the ECR library table
 * @param params react params
 * @param params.data Data to display
 * @returns Rows of data
 */
export const EcrTableData = ({ data }: { data: EcrDisplay[] }) => {
  return data.map((item, index) => <DataRow key={index} item={item} />);
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
