import { revalidatePath } from "next/cache";
import Link from "next/link";

import { getLoggedInUser } from "@/app/services/loggedInUserService";
import { listProgramAreas } from "@/app/services/programAreaService";
import { deleteUserAction } from "@/app/services/serverActionService";
import {
  isAdmin,
  listUsers,
  notFoundUnlessAnyAdmin,
} from "@/app/services/userService";

import { UserTable } from "./UserTable";

/**
 * User admin landing page with table of active users
 * @returns user admin page
 */
const UserAdminPage = async () => {
  await notFoundUnlessAnyAdmin();
  const loggedInUser = await getLoggedInUser();

  const users = await listUsers();
  const programAreas = await listProgramAreas();
  const isLoggedInUserAdmin = isAdmin(loggedInUser);

  // Program areas accessible to logged in user
  const accessibleProgramAreaUuids = new Set(
    programAreas.map(({ uuid }) => uuid),
  );
  const detailProgramAreaUuids = [
    ...new Set(
      // For program admins, filters on users that share at least one program area
      users
        .filter(
          ({ program_areas }) =>
            isLoggedInUserAdmin ||
            program_areas.some(({ program_area_uuid }) =>
              accessibleProgramAreaUuids.has(program_area_uuid),
            ),
        )
        // Program admins should be able to view all the 
        // program areas (and conditions) of their users.
        .flatMap(({ program_areas }) =>
          program_areas.map(({ program_area_uuid }) => program_area_uuid),
        ),
    ),
  ];
  const detailProgramAreas = isLoggedInUserAdmin
    ? programAreas
    : await listProgramAreas({ programAreaUuids: detailProgramAreaUuids });

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
          <UserTable
            users={users}
            programAreas={programAreas}
            detailProgramAreas={detailProgramAreas}
            isLoggedInUserAdmin={isLoggedInUserAdmin}
            deleteAction={async (uuid) => {
              "use server";
              revalidatePath("/ecr-viewer/admin/user");
              return await deleteUserAction({ uuid });
            }}
          />
        </div>
      </main>
    </>
  );
};

export default UserAdminPage;
