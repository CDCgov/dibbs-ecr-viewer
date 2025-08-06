import { revalidatePath } from "next/cache";

import { ProgramForm } from "@/app/admin/program/ProgramForm";
import { listConditionReferences } from "@/app/services/listConditionsService";
import { createProgramAreaAction } from "@/app/services/serverActionService";
import { notFoundUnlessAdmin } from "@/app/services/userService";

/**
 * @returns Page to create a program area
 */
const CreateProgramPage = async () => {
  await notFoundUnlessAdmin();

  const conditions = await listConditionReferences();
  const formTouchedMsg =
    "You have unsaved changes. To create a program area, you must add a program name and at least one condition.";

  return (
    <ProgramForm
      action="Create"
      initValues={{ conditions }}
      submitAction={async (name, conditions) => {
        "use server";
        revalidatePath("/ecr-viewer/admin/program");
        return await createProgramAreaAction({ name, conditions });
      }}
      formTouchedMsg={formTouchedMsg}
    />
  );
};

export default CreateProgramPage;
