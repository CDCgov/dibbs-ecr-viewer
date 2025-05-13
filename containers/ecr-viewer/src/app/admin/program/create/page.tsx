import { notFound } from "next/navigation";

import { ProgramForm } from "@/app/admin/program/ProgramForm";
import { listConditionReferences } from "@/app/services/listConditionsService";
import { createProgramArea } from "@/app/services/programAreaService";
import { getLoggedInUser, isAdmin } from "@/app/services/userService";

async function submitCreateProgramArea(form: FormData) {
  "use server";
  await createProgramArea(
    form.get("name") as string,
    form.getAll("conditions") as string[],
  );
}

/**
 * @returns Page to create a program area
 */
export const CreateProgramPage = async () => {
  const admin = await getLoggedInUser();
  if (!isAdmin(admin)) {
    notFound();
  }

  const conditions = await listConditionReferences();

  return (
    <main className="main-container">
      <div className="content-container margin-top-10">
        <h2 className="margin-bottom-5">Create program area</h2>
        <ProgramForm initValues={{ conditions }} />
      </div>
    </main>
  );
};

export default CreateProgramPage;
