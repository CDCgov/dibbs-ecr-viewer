import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";

import { UserForm, UserType } from "@/app/admin/user/UserForm";
import { listProgramAreas } from "@/app/services/programAreaService";
import { updateUserAction } from "@/app/services/serverActionService";
import {
  getUser,
  listUserProgramAreas,
  listUsers,
  notFoundUnlessAdmin,
} from "@/app/services/userService";
import { PageSearchParams } from "@/app/utils/search-param-utils";

/**
 * Edit a user
 * @param props Page props
 * @param props.searchParams Search params
 * @returns Page to edit a user
 */
const EditUserPage = async ({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) => {
  await notFoundUnlessAdmin();
  const { uuid } = searchParams;

  // nothing to edit here
  if (!uuid || typeof uuid !== "string") {
    notFound();
  }

  // Get the user, if it doesn't exist, 404
  const user = await getUser(uuid);
  if (!user) {
    notFound();
  }

  const userPrograms = await listUserProgramAreas(uuid);
  const userProgramUUIDs = new Set(userPrograms.map((up) => up.uuid));
  const initPrograms = (await listProgramAreas()).map((p) =>
    userProgramUUIDs.has(p.uuid) ? { ...p, checked: true } : p,
  );

  const isValidUserType = (value: string): value is UserType => {
    return value === "admin" || value === "standard";
  };

  const users = await listUsers();
  const otherUsers = users.filter(({ uuid: otherUuid }) => uuid !== otherUuid);

  return (
    <UserForm
      action="Edit"
      initValues={{
        email: user.email,
        userType: isValidUserType(user.user_type) ? user.user_type : undefined,
        programs: initPrograms,
        users: otherUsers,
      }}
      submitAction={async (email, userType, programs) => {
        "use server";
        revalidatePath("/ecr-viewer/admin/user");

        const res = await updateUserAction({
          uuid,
          updates: {
            email,
            user_type: userType,
          },
          programs,
        });
        return { error: res.error };
      }}
    />
  );
};

export default EditUserPage;
