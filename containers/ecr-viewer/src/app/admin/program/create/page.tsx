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

  return (
    <ProgramForm
      action="Create"
      initValues={{ conditions }}
      submitAction={async (name, conditions) => {
        "use server";
        revalidatePath("/ecr-viewer/admin/program");
        return await createProgramAreaAction({name, conditions});
      }}
    />
  );
};

export default CreateProgramPage;
