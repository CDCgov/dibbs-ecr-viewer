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
 * @returns Page to create a new user
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
          Back to user management
        </Link>
        <UserForm
          action="Create"
          initValues={{ programs }}
          submitAction={async (email, userType, programs) => {
            "use server";
            revalidatePath("/ecr-viewer/admin/user");

            const res = await createUserAction(email, userType);

            if (res.payload) {
              const userUUID = res.payload;
              return await updateUserProgramAreasAction(userUUID, programs);
            }
            return { error: res.error };
          }}
        />
      </div>
    </main>
  );
};

export default CreateUserPage;
