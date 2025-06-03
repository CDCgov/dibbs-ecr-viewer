import Link from "next/link";

import { listProgramAreas } from "@/app/services/programAreaService";
import { listUsers, notFoundUnlessAdmin } from "@/app/services/userService";

import { UserTable } from "./UserTable";

/**
 * User admin landing page with table of active users
 * @returns user admin page
 */
const UserAdminPage = async () => {
  await notFoundUnlessAdmin();

  const users = await listUsers();
  const programAreas = await listProgramAreas();

  return (
    <>
      <main className="main-container">
        <div className="content-container margin-top-10">
          <div className="display-flex flex-justify">
            <h2 className="margin-bottom-5">User management</h2>
            <div>
              <Link href="/admin/user/create" className="usa-button">
                Create user
              </Link>
            </div>
          </div>
          <UserTable users={users} programAreas={programAreas} />
        </div>
      </main>
    </>
  );
};

export default UserAdminPage;
