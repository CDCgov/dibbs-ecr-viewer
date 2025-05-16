"use client";
import { useState } from "react";

import {
  DetailsSidePanel,
  DetailsTrigger,
  useDetailsRef,
} from "@/app/components/DetailsSidePanel";
import {
  PaginatedSortableTable,
  TableColumn,
} from "@/app/components/table/PaginatedSortableTable";
import { ConditionReference } from "@/app/data/metadataDb/types/core";
import { formatDateTime } from "@/app/services/formatDateService";
import { ListedProgramArea } from "@/app/services/programAreaService";

/**
 *
 * @param props React props
 * @param props.programAreas listed program areas
 * @returns paginated, sorted table of program areas
 */
export const ProgramTable = ({
  programAreas,
}: {
  programAreas: ListedProgramArea[];
}) => {
  const detailsRef = useDetailsRef();
  const [selectedProgramArea, setSelectedProgramArea] =
    useState<ListedProgramArea | null>(null);

  const tableHeaders: TableColumn<ListedProgramArea>[] = [
    {
      id: "name",
      value: "Program Area",
      dataSortable: true,
      sortDirection: "ASC",
      formatter: (v: string, programArea: ListedProgramArea) => (
        <DetailsTrigger
          detailsRef={detailsRef}
          onClick={() => {
            setSelectedProgramArea(programArea);
          }}
        >
          {v}
        </DetailsTrigger>
      ),
    },
    {
      id: "conditions",
      value: "Number of Conditions",
      dataSortable: false,
      sortDirection: "",
      formatter: (conditions: ConditionReference[]) =>
        `${conditions.length} condition${conditions.length === 1 ? "" : "s"}`,
    },
  ];
  return (
    <div>
      <DetailsSidePanel
        detailsRef={detailsRef}
        title={selectedProgramArea?.name!}
        subtitle={`Created on ${formatDateTime(
          selectedProgramArea?.date_created.toISOString(),
        )}`}
        description="Program Area Information"
        details={[
          {
            title: "Name",
            value: selectedProgramArea?.name,
          },
          {
            title: "Conditions",
            value:
              selectedProgramArea?.conditions.length === 0 ? (
                "No conditions assigned"
              ) : (
                // TODO: style this!
                <ul>
                  {selectedProgramArea?.conditions
                    .sort()
                    .map(({ condition_name, code }) => (
                      <li key={code}>{condition_name}</li>
                    ))}
                </ul>
              ),
          },
        ]}
      />
      <PaginatedSortableTable
        initHeaders={tableHeaders}
        items={programAreas}
        itemType="Program areas"
      />
    </div>
  );
};
