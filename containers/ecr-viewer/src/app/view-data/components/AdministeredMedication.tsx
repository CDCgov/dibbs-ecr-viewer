import { noData } from "@/app/utils/data-utils";
import { formatDateTime } from "@/app/services/formatDateService";
import { BaseTable } from "@/app/view-data/components/EvaluateTable";
import React from "react";

type AdministeredMedicationProps = {
  medicationData: AdministeredMedicationTableData[];
};
export type AdministeredMedicationTableData = {
  name?: string;
  date?: string;
};

/**
 * Returns a table displaying administered medication information.
 * @param props - Props for the component.
 * @param props.medicationData - Array of data of medicine name and start date
 * @returns The JSX element representing the table, or undefined if no administered medications are found.
 */
export const AdministeredMedication = ({
  medicationData,
}: AdministeredMedicationProps) => {
  if (!medicationData?.length) {
    return null;
  }

  const columns = [
    { columnName: "Medication Name", className: "bg-gray-5 minw-15" },
    {
      columnName: "Medication Start Date/Time",
      className: "bg-gray-5 minw-15",
    },
  ];

  return (
    <BaseTable
      columns={columns}
      caption="Administered Medications"
      className={"margin-y-0"}
      fixed={false}
    >
      {medicationData.map((entry, index: number) => (
        <tr key={`table-row-${index}`}>
          <td>{entry?.name ?? noData}</td>
          <td>{formatDateTime(entry?.date) ?? noData}</td>
        </tr>
      ))}
    </BaseTable>
  );
};
