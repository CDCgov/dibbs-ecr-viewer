"use client";
import {
  PaginatedSortableTable,
  TableColumn,
} from "@/app/components/table/PaginatedSortableTable";
import { formatDateTime } from "@/app/services/formatDateService";
import { ListedUser, NamedUserPogramArea } from "@/app/services/userService";
import { toSentenceCase } from "@/app/utils/format-utils";

const tableHeaders: TableColumn<ListedUser>[] = [
  {
    id: "name",
    value: "User Name",
    dataSortable: true,
    sortDirection: "ASC",
  },
  {
    id: "email",
    value: "Email",
    dataSortable: true,
    sortDirection: "",
  },
  {
    id: "user_type",
    value: "User Type",
    dataSortable: true,
    sortDirection: "",
    formatter: toSentenceCase,
  },
  {
    id: "program_areas",
    value: "Program Areas",
    dataSortable: false,
    sortDirection: "",
    formatter: (pas: NamedUserPogramArea[], user) =>
      user.user_type === "admin"
        ? "All program areas"
        : pas.map(({ name }) => name).join(", ") || "No program areas assigned",
  },
  {
    id: "date_of_last_login",
    value: "Last Logged In",
    dataSortable: true,
    sortDirection: "",
    formatter: (d: Date | null) => formatDateTime(d?.toISOString()),
  },
];

/**
 *
 * @param props React props
 * @param props.users listed users
 * @returns paginated, sorted table of users
 */
export const UserTable = ({ users }: { users: ListedUser[] }) => {
  return (
    <PaginatedSortableTable
      initHeaders={tableHeaders}
      items={users}
      itemType="Users"
    />
  );
};
