import Link from "next/link";

import { getLoggedInUser, isAdmin } from "@/app/services/userService";
import { getLoggedInUserSession } from "@/app/utils/auth-utils";

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
          <Link href="/" className="usa-nav__link">
            eCR library
          </Link>
          <Link href="/admin/user" className="usa-nav__link">
            User management
          </Link>
          <Link href="/admin/program" className="usa-nav__link">
            Program management
          </Link>
        </>
      )}
      <UserMenu user={dbUser || sessionUser} />
    </div>
  );
};

export default NavLinks;
