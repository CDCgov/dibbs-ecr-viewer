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
import { ServerActionResult } from "@/app/services/errorService";
import { formatDateTime } from "@/app/services/formatDateService";
import { ListedProgramArea } from "@/app/services/programAreaService";
import { makePlural } from "@/app/utils/format-utils";

/**
 *
 * @param props React props
 * @param props.programAreas listed program areas
 * @param props.deleteAction action to do upon delete confirmation
 * @returns paginated, sorted table of program areas
 */
export const ProgramTable = ({
  programAreas,
  deleteAction,
}: {
  programAreas: ListedProgramArea[];
  deleteAction: (uuid: string) => Promise<ServerActionResult<void>>;
}) => {
  const detailsRef = useDetailsRef();
  const [selectedProgramArea, setSelectedProgramArea] =
    useState<ListedProgramArea | null>(null);

  const tableHeaders: TableColumn<ListedProgramArea>[] = [
    {
      id: "name",
      value: "Program area",
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
      value: "Number of conditions",
      dataSortable: false,
      sortDirection: "",
      formatter: (conditions: ConditionReference[]) =>
        `${conditions.length} condition${makePlural(conditions.length)}`,
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
        editHref={`/admin/program/edit?uuid=${selectedProgramArea?.uuid}`}
        itemType="program area"
        deleteAction={async () =>
          await deleteAction(selectedProgramArea?.uuid!)
        }
        deleteExplainerText="When you remove this program area, the program area will not be available in the eCR library for standard users."
        deleteModalTitle={`Remove ${selectedProgramArea?.name}`}
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
                <ul className="add-list-reset">
                  {selectedProgramArea?.conditions
                    .sort((a, b) =>
                      a.condition_name < b.condition_name ? -1 : 1,
                    )
                    .map(({ condition_name, code }) => (
                      <li
                        key={code}
                        className="border-bottom border-base-lightest padding-y-1"
                      >
                        {condition_name}
                      </li>
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
