"use client";
import { useEffect, useRef, useState } from "react";

import {
  Accordion,
  Modal,
  ModalHeading,
  ModalRef,
  ModalToggleButton,
} from "@trussworks/react-uswds";

import {
  PaginatedSortableTable,
  TableColumn,
} from "@/app/components/table/PaginatedSortableTable";
import { formatDateTime } from "@/app/services/formatDateService";
import { ListedUser, NamedUserPogramArea } from "@/app/services/userService";
import { toSentenceCase } from "@/app/utils/format-utils";

/**
 *
 * @param props React props
 * @param props.users listed users
 * @returns paginated, sorted table of users
 */
export const UserTable = ({ users }: { users: ListedUser[] }) => {
  const [selectedUser, setSelectedUser] = useState<ListedUser | null>(null);
  // TODO: implement listed program
  //   const [selectedUserPrograms, setSelectedUserPrograms] = useState<ListedProgram | null>(null)
  const modalRef = useRef<ModalRef>(null);

  useEffect(() => {}, [selectedUser]);

  const tableHeaders: TableColumn<ListedUser>[] = [
    {
      id: "email",
      value: "Email",
      dataSortable: true,
      sortDirection: "",
      formatter: (v: string, user: ListedUser) => (
        <ModalToggleButton
          type="button"
          modalRef={modalRef}
          className="action-text"
          unstyled={true}
          onClick={() => {
            setSelectedUser(user);
          }}
        >
          {v}
        </ModalToggleButton>
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
          : pas.map(({ name }) => name).join(", "),
    },
    {
      id: "date_of_last_login",
      value: "Last Logged In",
      dataSortable: true,
      sortDirection: "",
      formatter: (d: Date | null) => formatDateTime(d?.toISOString()),
    },
  ];

  return (
    <div>
      {selectedUser?.email}
      <Modal
        id="user-details"
        className="sidepanel-modal"
        ref={modalRef}
        aria-labelledby="modal-1-heading"
        aria-describedby="modal-1-description"
      >
        <div>
          <ModalHeading
            id="modal-1-heading"
            className="font-sans-3xl margin-bottom-0"
          >
            {selectedUser?.name ? selectedUser?.name : selectedUser?.email}
          </ModalHeading>
          <p className="text-base margin-bottom-2 margin-top-1">
            Last logged in:{" "}
            {selectedUser?.date_of_last_login
              ? formatDateTime(selectedUser?.date_of_last_login?.toISOString())
              : "Never"}
          </p>
        </div>
        <div className="section__line_gray" />

        <section>
          <h3 id="modal-1-description">User Information</h3>

          <dt>Name</dt>
          <dd>{selectedUser?.name ?? "Not on file"}</dd>

          <dt>Email</dt>
          <dd>{selectedUser?.email}</dd>

          <dt>User Type</dt>
          <dd>{toSentenceCase(selectedUser?.user_type)}</dd>

          <dt>Program Area Access</dt>
          <dd>
            <ProgramAreaContent user={selectedUser} />
          </dd>
        </section>
      </Modal>
      <PaginatedSortableTable
        initHeaders={tableHeaders}
        items={users}
        itemType="users"
      />
    </div>
  );
};

const ProgramAreaContent = ({ user }: { user: ListedUser | null }) => {
  if (user?.user_type === "admin") {
    return "All program areas";
  }

  if (!user || user.program_areas.length === 0) {
    return "No program areas assigned";
  }

  return (
    <Accordion
      items={user.program_areas.map((pa) => ({
        title: pa.name,
        content: <p>to do</p>,
        id: pa.program_area_uuid,
        expanded: false,
        headingLevel: "h4",
      }))}
    />
  );
};
