import { revalidatePath } from "next/cache";

import { UserForm } from "@/app/admin/user/UserForm";
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
  );
};

export default CreateUserPage;
