import { Table } from "@trussworks/react-uswds";
import { notFound } from "next/navigation";

import EcrTableHeader, { TableHeader } from "@/app/components/EcrTableHeader";
import Header from "@/app/components/Header";
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

  const users = await listUsers();

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
      id: "usertype",
      value: "User Type",
      className: "",
      dataSortable: true,
      sortDirection: "",
    },
    {
      id: "lastlogin",
      value: "Last Logged In",
      className: "",
      dataSortable: true,
      sortDirection: "",
    },
  ];

  return (
    <div className="display-flex flex-column height-viewport">
      <Header />
      <main>
        <Table bordered={false}>
          <EcrTableHeader headers={tableHeaders} disabled={false} />

          <tbody>
            {users.map((user) => (
              <tr key={user.uuid}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.user_type}</td>
                <td>{formatDate(user.date_of_last_login?.toISOString())}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </main>
    </div>
  );
};

export default UserAdminPage;
