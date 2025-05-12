import { notFound } from "next/navigation";

import Header from "@/app/components/Header";
import { listConditionReferences } from "@/app/services/listConditionsService";
import {
  createProgramArea,
  listProgramAreas,
} from "@/app/services/programAreaService";
import {
  createUser,
  getLoggedInUser,
  isAdmin,
  listUsers,
  updateUserProgramAreas,
} from "@/app/services/userService";

import { UserTable } from "./UserTable";

async function submitCreateUser(form: FormData) {
  "use server";
  const uuid = await createUser(
    form.get("email") as string,
    form.get("user_type") === "admin" ? "admin" : "standard",
  );

  await updateUserProgramAreas(uuid, form.getAll("programareas") as string[]);
}
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
const UserAdminPage = async () => {
  const admin = await getLoggedInUser();
  if (!isAdmin(admin)) {
    notFound();
  }

  const users = await listUsers();
  const programAreas = await listProgramAreas();
  // Only for form hackery - delete later
  const conditions = await listConditionReferences();

  return (
    <div className="display-flex flex-column height-viewport">
      <Header />
      <main className="main-container">
        <div className="content-container margin-top-10">
          <h2 className="margin-bottom-5">User Management</h2>
          <UserTable users={users} programAreas={programAreas} />
        </div>

        {/* HACKY, BUT USEFUL. KEEPING AROUND FOR THE MOMENT*/}
        {false && process.env.NODE_ENV !== "production" && (
          <div style={{ margin: "100px" }}>
            <h2>Scratch functionality to test above</h2>
            <form action={submitCreateUser}>
              <label>
                Email:
                <input type="text" required={true} id="email" name="email" />
              </label>
              <fieldset>
                <legend>User type:</legend>
                <div>
                  <label>
                    Standard User
                    <input
                      type="radio"
                      name="user_type"
                      required={true}
                      defaultChecked={true}
                      value="standard"
                    />
                  </label>
                  <label>
                    Admin User
                    <input
                      type="radio"
                      name="user_type"
                      required={true}
                      value="admin"
                    />
                  </label>
                </div>
              </fieldset>
              <fieldset>
                <legend>Program Areas:</legend>
                {programAreas.map((programArea) => (
                  <label>
                    {programArea.name}
                    <input
                      type="checkbox"
                      name="programareas"
                      value={programArea.uuid}
                    />
                  </label>
                ))}
              </fieldset>
              <button type="submit">Add New User</button>
            </form>

            <hr className="margin-y-4" />
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
      </main>
    </div>
  );
};

export default UserAdminPage;
