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
    <div className="usa-nav display-flex flex-row ">
      {isAdmin(dbUser) && (
        <ul className="usa-nav__primary usa-accordion">
          <li className="usa-nav__primary-item">
            <Link href="/" className="usa-nav__link">
              eCR library
            </Link>
          </li>
          <li className="usa-nav__primary-item">
            <Link href="/admin/user" className="usa-nav__link">
              User management
            </Link>
          </li>
          <li className="usa-nav__primary-item">
            <Link href="/admin/program" className="usa-nav__link">
              Program management
            </Link>
          </li>
        </ul>
      )}
      <UserMenu user={dbUser || sessionUser} />
    </div>
  );
};

export default NavLinks;
