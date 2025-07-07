import { revalidatePath } from "next/cache";
import Link from "next/link";

import { listProgramAreas } from "@/app/services/programAreaService";
import { deleteProgramAreaAction } from "@/app/services/serverActionService";
import { notFoundUnlessAdmin } from "@/app/services/userService";

import { ProgramTable } from "./ProgramTable";

/**
 * Program admin landing page with table of active users
 * @returns user admin page
 */
const ProgramAdminPage = async () => {
  await notFoundUnlessAdmin();

  const programAreas = await listProgramAreas();

  return (
    <main className="main-container">
      <div className="content-container margin-top-10">
        <div className="display-flex flex-justify">
          <h2 className="margin-bottom-5">Program management</h2>
          <div>
            <Link href="/admin/program/create" className="usa-button">
              Create program area
            </Link>
          </div>
        </div>
        {programAreas.length === 0 ? (
          <div className="width-full height-half bg-base-lightest display-flex flex-align-center flex-justify-center">
            <p className="text-bold font-size-lg">No program areas added</p>
          </div>
        ) : (
          <ProgramTable
            programAreas={programAreas}
            deleteAction={async (uuid) => {
              "use server";
              const res = await deleteProgramAreaAction(uuid);
              revalidatePath("/ecr-viewer/admin/program");
              return res;
            }}
          />
        )}
      </div>
    </main>
  );
};

export default ProgramAdminPage;
