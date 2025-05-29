import { revalidatePath } from "next/cache";

import { ProgramForm } from "@/app/admin/program/ProgramForm";
import { listConditionReferences } from "@/app/services/listConditionsService";
import { createProgramArea } from "@/app/services/programAreaService";
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
        await createProgramArea(name, conditions);
        revalidatePath("/ecr-viewer/admin/program");
      }}
    />
  );
};

export default CreateProgramPage;
