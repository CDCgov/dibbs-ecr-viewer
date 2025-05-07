import { notFound } from "next/navigation";

import Header from "@/app/components/Header";
import {
  createUser,
  getLoggedInUser,
  isAdmin,
  listUsers,
} from "@/app/services/userService";

import { UserTable } from "./UserTable";

async function submitCreateUser(form: FormData) {
  "use server";
  console.log({ form });

  const uuid = await createUser(
    form.get("email") as string,
    form.get("user_type") === "admin" ? "admin" : "standard",
  );
  console.log({ uuid });
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

  return (
    <div className="display-flex flex-column height-viewport">
      <Header />
      <main className="main-container">
        <div className="content-container margin-top-10">
          <h2 className="margin-bottom-5">User Management</h2>
          <UserTable users={users} />
        </div>
      </main>

      {/* HACKY, BUT USEFUL. KEEPING AROUND FOR THE MOMENT*/}
      {process.env.NODE_ENV !== "production" && (
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
              <legend>
                Select program areas: TODO: merge program area crud :(
              </legend>
            </fieldset>
            <button type="submit">Add New User</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default UserAdminPage;
