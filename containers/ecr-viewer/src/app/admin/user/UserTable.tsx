"use client";
import { Dispatch, SetStateAction, useState } from "react";

import { Accordion } from "@trussworks/react-uswds";

import {
  CheckboxOptions,
  Filter,
  RadioDateOptions,
  SelectDeselectAllCheckbox,
} from "@/app/components/BaseFilter";
import {
  DetailsSidePanel,
  DetailsTrigger,
  useDetailsRef,
} from "@/app/components/DetailsSidePanel";
import FilterGroup from "@/app/components/FilterGroup";
import { Folder, Person } from "@/app/components/Icon";
import {
  PaginatedSortableTable,
  TableColumn,
} from "@/app/components/table/PaginatedSortableTable";
import { ServerActionResult } from "@/app/services/errorService";
import { formatDateTime } from "@/app/services/formatDateService";
import { ListedProgramArea } from "@/app/services/programAreaService";
import { ListedUser, NamedUserPogramArea } from "@/app/services/userService";
import { makePlural, toSentenceCase } from "@/app/utils/format-utils";
import { ForceClient } from "@/app/view-data/components/ForceClient";

const USER_TYPE_OPTIONS: Record<string, string> = {
  all: "All users",
  admin: "Admin",
  standard: "Standard",
};
const NO_PROGRAM_AREA_OPTION: string = "No program areas (Standard)";
const ALL_PROGRAM_AREAS_OPTION: string = "All program areas (Admin)";

type FilterProgramAreasType = Record<string, boolean>;

/**
 *
 * @param props React props
 * @param props.users listed users
 * @param props.programAreas listed program areas
 * @param props.deleteAction action to do upon delete confirmation
 * @returns paginated, sorted table of users
 */
export const UserTable = ({
  users,
  programAreas,
  deleteAction,
}: {
  users: ListedUser[];
  programAreas: ListedProgramArea[];
  deleteAction: (uuid: string) => Promise<ServerActionResult<void>>;
}) => {
  const sortedProgramAreas = [...programAreas].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const anyUsersNoPrograms = users.some(
    (user) => user.user_type === "standard" && user.program_areas.length === 0,
  );
  const initFilterProgramAreaState: FilterProgramAreasType = {
    [ALL_PROGRAM_AREAS_OPTION]: true,
    ...(anyUsersNoPrograms ? { [NO_PROGRAM_AREA_OPTION]: true } : {}),
    ...sortedProgramAreas.reduce((acc, program) => {
      acc[program.name] = true;
      return acc;
    }, {} as FilterProgramAreasType),
  };

  const [selectedUser, setSelectedUser] = useState<ListedUser | null>(null);
  const [filterUserTypeOption, setFilterUserTypeOption] =
    useState<string>("all");
  const [filterProgramAreas, setFilterProgramAreas] = useState(
    initFilterProgramAreaState,
  );
  const detailsRef = useDetailsRef();

  const isAllSelected = Object.values(filterProgramAreas).every(
    (prog) => prog === true,
  );

  // If no program areas are selected, do not show any users including admins
  const filteredUsers = users.filter(({ user_type, program_areas }) => {
    // Match user type
    if (filterUserTypeOption !== "all" && filterUserTypeOption !== user_type) {
      return false;
    }

    // Standard users not assigned to any program areas
    if (
      user_type === "standard" &&
      program_areas.length === 0 &&
      filterProgramAreas[NO_PROGRAM_AREA_OPTION]
    ) {
      return true;
    }

    // Admin users must have All program areas (Admin) selected
    if (user_type === "admin" && filterProgramAreas[ALL_PROGRAM_AREAS_OPTION]) {
      return true;
    }

    return program_areas.some((program) => filterProgramAreas[program.name]);
  });

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
      value: "User type",
      dataSortable: true,
      sortDirection: "",
      formatter: toSentenceCase,
    },
    {
      id: "program_areas",
      value: "Program areas",
      dataSortable: false,
      sortDirection: "",
      formatter: (pas: NamedUserPogramArea[], user) =>
        user.user_type === "admin"
          ? "All program areas"
          : pas
              .map(({ name }) => name)
              .sort()
              .join(", ") || "No program areas assigned",
    },
    {
      id: "date_of_last_login",
      value: "Last logged in",
      dataSortable: true,
      sortDirection: "",
      formatter: (d: Date | null) => (
        <ForceClient loading={null}>
          {formatDateTime(d?.toISOString())}
        </ForceClient>
      ),
    },
  ];

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
        editHref={`/admin/user/edit?uuid=${selectedUser?.uuid}`}
        itemType="user"
        deleteAction={async () => await deleteAction(selectedUser?.uuid!)}
        deleteExplainerText="Removing the user will remove the user account and data from the eCR Viewer. The user account and data will still be available in your login provider."
        deleteModalTitle={`Remove ${selectedUser?.name || selectedUser?.email}`}
        deleteModalBody={
          <p>
            This action will not edit or remove the user from your login
            provider.
          </p>
        }
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
      <FilterGroup
        resetEnabled={filterUserTypeOption !== "all" || !isAllSelected}
        resetHandler={() => {
          setFilterUserTypeOption("all");
          setFilterProgramAreas(initFilterProgramAreaState);
        }}
      >
        <FilterByUserType
          filterUserTypeOption={filterUserTypeOption}
          setFilterUserTypeOption={setFilterUserTypeOption}
        />
        <FilterByProgramArea
          isAllSelected={isAllSelected}
          filterProgramAreas={filterProgramAreas}
          setFilterProgramAreas={setFilterProgramAreas}
        />
      </FilterGroup>
      <PaginatedSortableTable
        initHeaders={tableHeaders}
        items={filteredUsers}
        itemType="Users"
      />
    </div>
  );
};

const FilterByUserType = ({
  filterUserTypeOption,
  setFilterUserTypeOption,
}: {
  filterUserTypeOption: string;
  setFilterUserTypeOption: (v: string) => void;
}) => {
  return (
    <Filter
      isActive={true}
      type="user type"
      title={USER_TYPE_OPTIONS[filterUserTypeOption]}
      resetHandler={() => {}}
      icon={Person}
    >
      <div className="display-flex flex-column margin-bottom-1">
        <RadioDateOptions
          groupName="user-type"
          optionsMap={USER_TYPE_OPTIONS}
          onChange={setFilterUserTypeOption}
          currentOption={filterUserTypeOption}
          classNames="padding-bottom-1"
        />
      </div>
    </Filter>
  );
};

const FilterByProgramArea = ({
  isAllSelected,
  filterProgramAreas,
  setFilterProgramAreas,
}: {
  isAllSelected: boolean;
  filterProgramAreas: FilterProgramAreasType;
  setFilterProgramAreas: Dispatch<SetStateAction<FilterProgramAreasType>>;
}) => {
  const handleSelectDeselectAll = () => {
    const updatedProgramAreas = Object.keys(filterProgramAreas).reduce(
      (acc, programName) => {
        acc[programName] = !isAllSelected;
        return acc;
      },
      {} as FilterProgramAreasType,
    );
    setFilterProgramAreas(updatedProgramAreas);
  };

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = event.target;
    setFilterProgramAreas((prev) => {
      return { ...prev, [value]: checked };
    });
  };

  return (
    <Filter
      isActive={!isAllSelected}
      type="program area"
      title="Program area"
      resetHandler={() => {}}
      icon={Folder}
      tag={
        Object.values(filterProgramAreas).filter((prog) => prog === true)
          .length || "0"
      }
    >
      {/* Select All checkbox */}
      <div className="display-flex flex-column">
        <SelectDeselectAllCheckbox
          groupName="program area"
          onChange={handleSelectDeselectAll}
          isAllSelected={isAllSelected}
        />
        <div className="border-top-1px border-base-lighter margin-x-105"></div>
        {/* (Scroll) Filter by Program Area checkboxes */}
        <CheckboxOptions
          groupName="program area"
          filterItems={filterProgramAreas}
          onChange={handleCheckboxChange}
        />
      </div>
      <div className="border-top-1px border-base-lighter margin-x-neg-105"></div>
    </Filter>
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
                {makePlural(conditionNames.length)}
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
