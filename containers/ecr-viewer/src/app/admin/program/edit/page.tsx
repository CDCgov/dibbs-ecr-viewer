import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";

import { ProgramForm } from "@/app/admin/program/ProgramForm";
import { listConditionReferences } from "@/app/services/listConditionsService";
import { getProgramArea } from "@/app/services/programAreaService";
import { updateProgramAreaAction } from "@/app/services/serverActionService";
import { notFoundUnlessAdmin } from "@/app/services/userService";
import { PageSearchParams } from "@/app/utils/search-param-utils";

/**
 * @param props page props
 * @param props.searchParams Search params
 * @returns Page to create a program area
 */
const EditProgramPage = async ({
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

  // Get the program, if it doesn't exist, 404
  const prog = await getProgramArea(uuid);
  if (!prog) {
    notFound();
  }
  const conditions = (await listConditionReferences()).map((c) =>
    c.program_area_uuid === prog.uuid ? { ...c, checked: true } : c,
  );

  return (
    <ProgramForm
      action="Edit"
      progUuid={uuid}
      initValues={{ name: prog.name, conditions }}
      submitAction={async (name, conditions) => {
        "use server";
        revalidatePath("/ecr-viewer/admin/program");
        return await updateProgramAreaAction(uuid, { name, conditions });
      }}
    />
  );
};

export default EditProgramPage;
