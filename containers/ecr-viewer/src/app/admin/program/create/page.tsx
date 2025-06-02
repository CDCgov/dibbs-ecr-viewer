import { revalidatePath } from "next/cache";
import Link from "next/link";

import { ProgramForm } from "@/app/admin/program/ProgramForm";
import { ArrowBack } from "@/app/components/Icon";
import { listConditionReferences } from "@/app/services/listConditionsService";
import { createProgramAreaAction } from "@/app/services/programAreaService";
import { notFoundUnlessAdmin } from "@/app/services/userService";

/**
 * @returns Page to create a program area
 */
const CreateProgramPage = async () => {
  await notFoundUnlessAdmin();

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
          action="Create"
          initValues={{ conditions }}
          submitAction={async (name, conditions) => {
            "use server";
            revalidatePath("/ecr-viewer/admin/program");
            return await createProgramAreaAction(name, conditions);
          }}
        />
      </div>
    </main>
  );
};

export default CreateProgramPage;
