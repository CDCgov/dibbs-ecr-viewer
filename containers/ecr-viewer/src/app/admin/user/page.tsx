import { notFound } from "next/navigation";

import Header from "@/app/components/Header";
import {
  getLoggedInUser,
  isAdmin,
  listUsers,
} from "@/app/services/userService";

import { UserTable } from "./UserTable";

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

  return (
    <div className="display-flex flex-column height-viewport">
      <Header />
      <main className="main-container">
        <div className="content-container margin-top-10">
          <h2 className="margin-bottom-5">User Management</h2>
          <UserTable users={users} />
        </div>
      </main>
    </div>
  );
};

export default UserAdminPage;
