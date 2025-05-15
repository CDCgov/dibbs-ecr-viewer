"use client";
import {
  PaginatedSortableTable,
  TableColumn,
} from "@/app/components/table/PaginatedSortableTable";
import { ConditionReference } from "@/app/data/metadataDb/types/core";
import { ListedProgramArea } from "@/app/services/programAreaService";

const tableHeaders: TableColumn<ListedProgramArea>[] = [
  {
    id: "name",
    value: "Program Area",
    dataSortable: true,
    sortDirection: "ASC",
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
  return (
    <PaginatedSortableTable
      initHeaders={tableHeaders}
      items={programAreas}
      itemType="Program areas"
    />
  );
};
