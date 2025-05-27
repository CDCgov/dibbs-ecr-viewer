import { revalidatePath } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProgramForm } from "@/app/admin/program/ProgramForm";
import { ArrowBack } from "@/app/components/Icon";
import { listConditionReferences } from "@/app/services/listConditionsService";
import { updateProgramArea } from "@/app/services/programAreaService";
import { notFoundUnlessAdmin } from "@/app/services/userService";
import { PageSearchParams } from "@/app/utils/search-param-utils";

/**
 * @param props page props
 * @param props.searchParams Search params
 * @returns Page to create a program area
 */
const CreateProgramPage = async ({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) => {
  await notFoundUnlessAdmin();

  // nothing to edit here
  if (!searchParams.uuid || typeof searchParams.uuid !== "string") {
    notFound();
  }

  // TODO, geth the program area and set up the init values
  const conditions = await listConditionReferences();

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
          initValues={{ conditions }}
          submitAction={async (name, conditions) => {
            "use server";
            await updateProgramArea(searchParams.uuid, { name, conditions });
            revalidatePath("/ecr-viewer/admin/program");
          }}
        />
      </div>
    </main>
  );
};

export default CreateProgramPage;
