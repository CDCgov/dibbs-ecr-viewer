"use client";
import { useState } from "react";

import { Accordion } from "@trussworks/react-uswds";

import {
  DetailsSidePanel,
  DetailsTrigger,
  useDetailsRef,
} from "@/app/components/DetailsSidePanel";
import {
  PaginatedSortableTable,
  TableColumn,
} from "@/app/components/table/PaginatedSortableTable";
import { formatDateTime } from "@/app/services/formatDateService";
import { ListedProgramArea } from "@/app/services/programAreaService";
import { ListedUser, NamedUserPogramArea } from "@/app/services/userService";
import { toSentenceCase } from "@/app/utils/format-utils";

/**
 *
 * @param props React props
 * @param props.users listed users
 * @param props.programAreas listed program areas
 * @returns paginated, sorted table of users
 */
export const UserTable = ({
  users,
  programAreas,
}: {
  users: ListedUser[];
  programAreas: ListedProgramArea[];
}) => {
  const [selectedUser, setSelectedUser] = useState<ListedUser | null>(null);
  const detailsRef = useDetailsRef();

  const tableHeaders: TableColumn<ListedUser>[] = [
    {
      id: "email",
      value: "Email",
      dataSortable: true,
      sortDirection: "",
      formatter: (v: string, user: ListedUser) => (
        <DetailsTrigger
          detailsRef={detailsRef}
          onClick={() => {
            setSelectedUser(user);
          }}
        >
          {v}
        </DetailsTrigger>
      ),
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
          : pas.map(({ name }) => name).join(", ") ||
            "No program areas assigned",
    },
    {
      id: "date_of_last_login",
      value: "Last Logged In",
      dataSortable: true,
      sortDirection: "",
      formatter: (d: Date | null) => formatDateTime(d?.toISOString()),
    },
  ];

  // TODO an actual loading state
  return (
    <div>
      <DetailsSidePanel
        detailsRef={detailsRef}
        title={selectedUser?.name ? selectedUser?.name : selectedUser?.email!}
        subtitle={`Last logged in: ${
          selectedUser?.date_of_last_login
            ? formatDateTime(selectedUser?.date_of_last_login?.toISOString())
            : "Never"
        }`}
        description="User Information"
        details={[
          {
            title: "Name",
            value: selectedUser?.name ?? "Not on file",
          },
          {
            title: "Email",
            value: selectedUser?.email,
          },
          {
            title: "User Type",
            value: toSentenceCase(selectedUser?.user_type),
          },
          {
            title: "Program Area Access",
            value: (
              <ProgramAreaContent
                user={selectedUser}
                programAreas={programAreas}
              />
            ),
          },
        ]}
      />
      <PaginatedSortableTable
        initHeaders={tableHeaders}
        items={users}
        itemType="Users"
      />
    </div>
  );
};

const ProgramAreaContent = ({
  user,
  programAreas,
}: {
  user: ListedUser | null;
  programAreas: ListedProgramArea[];
}) => {
  if (user?.user_type === "admin") {
    return "All program areas";
  }

  if (!user || user.program_areas.length === 0) {
    return "No program areas assigned";
  }

  return (
    <Accordion
      multiselectable={true}
      className="accordion-dibbs"
      items={user.program_areas.map((pa) => {
        const conditionNames =
          programAreas
            .find(({ uuid }) => pa.program_area_uuid === uuid)
            ?.conditions.map(({ condition_name }) => condition_name) || [];

        return {
          title: (
            <div className="display-flex flex-justify text-normal">
              <span>{pa.name}</span>
              <span>
                {conditionNames.length} condition
                {conditionNames.length !== 1 && "s"}
              </span>
            </div>
          ),
          content:
            conditionNames?.join(", ") ||
            "No conditions assigned to program area",
          id: pa.program_area_uuid,
          expanded: false,
          headingLevel: "h4",
        };
      })}
    />
  );
};
