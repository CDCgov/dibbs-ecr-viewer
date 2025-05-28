import { revalidatePath } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProgramForm } from "@/app/admin/program/ProgramForm";
import { ArrowBack } from "@/app/components/Icon";
import { listConditionReferences } from "@/app/services/listConditionsService";
import {
  getProgramArea,
  updateProgramArea,
} from "@/app/services/programAreaService";
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
  console.log({ uuid });

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
    <main className="main-container">
      <div className="content-container margin-top-10">
        <Link
          href="/admin/program"
          className="action-text margin-bottom-3 display-inline-flex flex-align-center"
        >
          <ArrowBack aria-hidden={true} className="square-3" />
          Back to program management
        </Link>
        <ProgramForm
          action="Edit"
          progUuid={uuid}
          initValues={{ name: prog.name, conditions }}
          submitAction={async (name, conditions) => {
            "use server";
            await updateProgramArea(uuid, { name, conditions });
            revalidatePath("/ecr-viewer/admin/program");
          }}
        />
      </div>
    </main>
  );
};

export default EditProgramPage;
