import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";

import { ProgramForm } from "@/app/admin/program/ProgramForm";
import { listAdminConditionReferences } from "@/app/services/listConditionsService";
import { getProgramArea } from "@/app/services/programAreaService";
import { updateProgramAreaAction } from "@/app/services/serverActionService";
import { notFoundUnlessAnyAdmin } from "@/app/services/userService";
import { PageSearchParams } from "@/app/utils/search-param-utils";

/**
 * @param props page props
 * @param props.searchParams Search params
 * @returns Page to edit a program area
 */
const EditProgramPage = async ({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) => {
  await notFoundUnlessAnyAdmin();
  const { uuid } = await searchParams;

  // nothing to edit here
  if (!uuid || typeof uuid !== "string") {
    notFound();
  }

  // Get the program, if it doesn't exist, 404
  const prog = await getProgramArea(uuid);
  if (!prog) {
    notFound();
  }
  const conditions = (await listAdminConditionReferences()).map((c) =>
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
        return await updateProgramAreaAction({ uuid, name, conditions });
      }}
    />
  );
};

export default EditProgramPage;
