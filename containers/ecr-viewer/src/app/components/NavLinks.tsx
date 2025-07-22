import { getLoggedInUser, isAdmin } from "@/app/services/userService";
import { getLoggedInUserSession } from "@/app/utils/auth-utils";

import NavLink from "./NavLink";
import UserMenu from "./UserMenu";

/**
 * Nav links component for the eCR Viewer Header.
 * This component renders navigation links for admin users and returns a
 * user menu containing user information and a sign-out button
 * @returns The header nav links and a user menu
 */
const NavLinks = async () => {
  const sessionUser = await getLoggedInUserSession();
  if (!sessionUser) return;

  const dbUser = await getLoggedInUser();

  return (
    <div className="display-flex flex-row">
      {isAdmin(dbUser) && (
        <>
          <NavLink href="/">eCR library</NavLink>
          <NavLink href="/admin/user">User management</NavLink>
          <NavLink href="/admin/program">Program management</NavLink>
        </>
      )}
      <UserMenu user={dbUser || sessionUser} />
    </div>
  );
};

export default NavLinks;
