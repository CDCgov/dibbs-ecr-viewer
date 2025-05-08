"use client";
import { useRef, useState } from "react";

import {
  Modal,
  ModalFooter,
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
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const modalRef = useRef<ModalRef>(null);

  const tableHeaders: TableColumn<ListedUser>[] = [
    {
      id: "email",
      value: "Email",
      dataSortable: true,
      sortDirection: "",
      formatter: (v: string) => (
        <ModalToggleButton
          type="button"
          modalRef={modalRef}
          className="action-text"
          unstyled={true}
          onClick={() => {
            setSelectedUser(v);
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
      {selectedUser}
      <Modal
        id="user-details"
        ref={modalRef}
        aria-labelledby="modal-1-heading"
        aria-describedby="modal-1-description"
      >
        <ModalHeading id="modal-1-heading">
          Are you sure you want to continue?
        </ModalHeading>
        <div className="usa-prose">
          <p id="modal-1-description">User information.</p>
        </div>
        <ModalFooter>I am footer</ModalFooter>
        {selectedUser}
      </Modal>
      <PaginatedSortableTable
        initHeaders={tableHeaders}
        items={users}
        itemType="users"
      />
    </div>
  );
};
