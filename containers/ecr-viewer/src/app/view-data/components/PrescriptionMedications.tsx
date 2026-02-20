import React from "react";

//import { formatDateTime } from "@/app/services/formatDateService";
import { noData } from "@/app/utils/data-utils";

import { BaseTable } from "./EvaluateTable";

type PrescriptionMedicationsProps = {
  prescriptionMedications: PrescriptionMedicationTableData[];
};
export type PrescriptionMedicationTableData = {
  name?: string;
};

/**
 * Returns a table displaying prescription medication information.
 * @param props - Props for the component.
 * @param props.prescriptionMedications - Array of data of medicine prescribed
 * @returns The JSX element representing the table, or undefined if no administered medications are found.
 */
export const PrescriptionMedications = ({
  prescriptionMedications,
}: PrescriptionMedicationsProps) => {
  if (!prescriptionMedications?.length) {
    return null;
  }

  const columns = [
    { columnName: "Medication Name", className: "bg-gray-5 minw-15" },
  ];

  return (
    <BaseTable columns={columns} className="margin-y-0" fixed={false}>
      {prescriptionMedications.map((entry, index: number) => (
        <tr key={`table-row-${index}`}>
          <td>{entry?.name ?? noData}</td>
        </tr>
      ))}
    </BaseTable>
  );
};
