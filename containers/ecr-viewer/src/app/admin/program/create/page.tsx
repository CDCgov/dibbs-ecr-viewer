import Link from "next/link";

import { ProgramForm } from "@/app/admin/program/ProgramForm";
import { ArrowBack } from "@/app/components/Icon";
import { listConditionReferences } from "@/app/services/listConditionsService";
import { notFoundUnlessAdmin } from "@/app/services/userService";

// async function submitCreateProgramArea(form: FormData) {
//   "use server";
//   await createProgramArea(
//     form.get("name") as string,
//     form.getAll("conditions") as string[],
//   );
// }

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
        <ProgramForm title="Create program area" initValues={{ conditions }} />
      </div>
    </main>
  );
};

export default CreateProgramPage;
