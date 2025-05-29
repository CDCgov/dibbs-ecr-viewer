import { revalidatePath } from "next/cache";
import Link from "next/link";

import { UserForm } from "@/app/admin/user/UserForm";
import { ArrowBack } from "@/app/components/Icon";
import { listProgramAreas } from "@/app/services/programAreaService";
import {
  createUserAction,
  notFoundUnlessAdmin,
  updateUserProgramAreasAction,
} from "@/app/services/userService";

/**
 * @returns Page to add a new user
 */
const CreateUserPage = async () => {
  await notFoundUnlessAdmin();

  const programs = await listProgramAreas();

  return (
    <main className="main-container">
      <div className="content-container margin-top-10">
        <Link
          href="/admin/user"
          className="action-text margin-bottom-3 display-inline-flex flex-align-center"
        >
          <ArrowBack aria-hidden={true} className="square-3" />
          Back to User Management
        </Link>
        <UserForm
          action="Add"
          initValues={{ programs }}
          submitAction={async (email, userType, programs) => {
            "use server";
            revalidatePath("/ecr-viewer/admin/user");

            const res = await createUserAction(email, userType);

            if (res.payload) {
              const userUUID = res.payload;
              await updateUserProgramAreasAction(userUUID, programs);
            }
            return res;
          }}
        />
      </div>
    </main>
  );
};

export default CreateUserPage;
