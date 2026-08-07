import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";

import { UserForm } from "@/app/admin/user/UserForm";
import { USER_TYPE } from "@/app/constants";
import { isAdmin, UserType } from "@/app/services/userService";
import { listProgramAreas } from "@/app/services/programAreaService";
import { updateUserAction } from "@/app/services/serverActionService";
import {
  getUser,
  listUserProgramAreas,
  listUsers,
  notFoundUnlessAdmin,
} from "@/app/services/userService";
import { PageSearchParams } from "@/app/utils/search-param-utils";
import { getLoggedInUser } from "@/app/services/loggedInUserService";

/**
 * Edit a user
 * @param props Page props
 * @param props.searchParams Search params
 * @returns Page to edit a user
 */
const EditUserPage = async ({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) => {
  await notFoundUnlessAdmin();
  const currentUser = await getLoggedInUser();
  const { uuid } = await searchParams;

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
    return value === USER_TYPE.ADMIN || value === USER_TYPE.PROG_ADMIN || value === USER_TYPE.STANDARD;
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
      isLoggedInUserAdmin={isAdmin(currentUser)}
    />
  );
};

export default EditUserPage;
