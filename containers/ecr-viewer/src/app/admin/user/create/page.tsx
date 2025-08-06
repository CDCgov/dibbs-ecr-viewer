import { Alert, Link } from "@trussworks/react-uswds";
import { revalidatePath } from "next/cache";

import { UserForm } from "@/app/admin/user/UserForm";
import { listProgramAreas } from "@/app/services/programAreaService";
import { createUserAction } from "@/app/services/serverActionService";
import { notFoundUnlessAdmin } from "@/app/services/userService";

/**
 * @returns Page to create a new user
 */
const CreateUserPage = async () => {
  await notFoundUnlessAdmin();

  const programs = await listProgramAreas();
  const formTouchedMsg =
    "To create a user, you must add an email and select a user type.";

  return (
    <UserForm
      action="Create"
      initValues={{ programs }}
      submitAction={async (email, userType, programs) => {
        "use server";
        revalidatePath("/ecr-viewer/admin/user");

        const res = await createUserAction({ email, userType, programs });
        return { error: res.error };
      }}
      formTouchedMsg={formTouchedMsg}
      banner={
        programs.length === 0 && (
          <Alert
            type="warning"
            heading="You haven't made any program areas"
            headingLevel="h4"
            noIcon={true}
          >
            When you create a user, they won't have access to any eCRs until you
            create a program area.{" "}
            <Link href="/ecr-viewer/admin/program/create">
              Create a program area
            </Link>
          </Alert>
        )
      }
    />
  );
};

export default CreateUserPage;
