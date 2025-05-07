import { notFound } from "next/navigation";

import Header from "@/app/components/Header";
import { PaginatedSortableTable } from "@/app/components/table/PaginatedSortableTable";
import { TableHeader } from "@/app/components/table/ecr/EcrTableHeader";
import { formatDate } from "@/app/services/formatDateService";
import {
  getLoggedInUser,
  isAdmin,
  listUsers,
} from "@/app/services/userService";

/**
 * User admin landing page with table of active users
 * @returns user admin page
 */
const UserAdminPage = async () => {
  const admin = await getLoggedInUser();
  if (!isAdmin(admin)) {
    notFound();
  }

  const users = (await listUsers()).map((u) => ({
    ...u,
    date_of_last_login: formatDate(u.date_of_last_login?.toISOString()),
    date_created: formatDate(u.date_created.toISOString()),
  }));

  const tableHeaders: TableHeader[] = [
    {
      id: "name",
      value: "User Name",
      className: "",
      dataSortable: true,
      sortDirection: "ASC",
    },
    {
      id: "email",
      value: "Email",
      className: "",
      dataSortable: true,
      sortDirection: "",
    },
    {
      id: "user_type",
      value: "User Type",
      className: "",
      dataSortable: true,
      sortDirection: "",
    },
    {
      id: "date_of_last_login",
      value: "Last Logged In",
      className: "",
      dataSortable: true,
      sortDirection: "",
    },
  ];

  return (
    <div className="display-flex flex-column height-viewport">
      <Header />
      <main className="main-container">
        <div className="content-container">
          <PaginatedSortableTable
            initHeaders={tableHeaders}
            items={users}
            itemType="users"
          />
        </div>
      </main>
    </div>
  );
};

export default UserAdminPage;
