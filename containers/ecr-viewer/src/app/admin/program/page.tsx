import { notFound } from "next/navigation";

import Header from "@/app/components/Header";
import { listConditionReferences } from "@/app/services/listConditionsService";
import {
  createProgramArea,
  listProgramAreas,
} from "@/app/services/programAreaService";
import { getLoggedInUser, isAdmin } from "@/app/services/userService";

import { ProgramTable } from "./ProgramTable";

async function submitCreateProgramArea(form: FormData) {
  "use server";
  await createProgramArea(
    form.get("name") as string,
    form.getAll("conditions") as string[],
  );
}

/**
 * User admin landing page with table of active users
 * @returns user admin page
 */
const ProgramAdminPage = async () => {
  const admin = await getLoggedInUser();
  if (!isAdmin(admin)) {
    notFound();
  }

  const programAreas = await listProgramAreas();
  // Only for form hackery - delete later
  const conditions = await listConditionReferences();

  return (
    <div className="display-flex flex-column height-viewport">
      <Header />
      <main className="main-container">
        <div className="content-container margin-top-10">
          <h2 className="margin-bottom-5">Program management</h2>
          {programAreas.length === 0 ? (
            <div className="width-full height-half bg-base-lightest display-flex flex-align-center flex-justify-center">
              <p className="text-bold font-size-lg">No program areas added</p>
            </div>
          ) : (
            <ProgramTable programAreas={programAreas} />
          )}
        </div>
      </main>

      {/* HACKY, BUT USEFUL. KEEPING AROUND FOR THE MOMENT*/}
      {process.env.NODE_ENV !== "production" && (
        <div style={{ margin: "100px" }}>
          <h2>Scratch functionality to test above</h2>
          <form action={submitCreateProgramArea}>
            <label>
              Name:
              <input type="text" required={true} id="name" name="name" />
            </label>
            <fieldset>
              <legend>Conditions:</legend>
              {conditions.map((condition) => (
                <label>
                  {condition.condition_name}
                  <input
                    type="checkbox"
                    name="conditions"
                    value={condition.code}
                  />
                </label>
              ))}
            </fieldset>
            <button type="submit">Add New Program Area</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ProgramAdminPage;
