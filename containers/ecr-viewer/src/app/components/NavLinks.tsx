import {getLoggedInUser, isAdmin} from "@/app/services/userService";

import UserMenu from "./UserMenu";

const NavLinks = async () => {

    const user = await getLoggedInUser()

    return user && (
        <div className="usa-nav display-flex flex-row ">
            { isAdmin(user) &&
            <ul className="usa-nav__primary usa-accordion">
                <li className="usa-nav__primary-item">
                    <a href="/ecr-viewer" className="usa-nav__link">eCR Library</a>
                </li>
                <li className="usa-nav__primary-item">
                    <a href="/" className="usa-nav__link">User Management</a>
                </li>
                <li className="usa-nav__primary-item">
                    <a href="/" className="usa-nav__link">Program Management</a>
                </li>
            </ul>
            }
            <UserMenu user={user}/>
    </div >)
}

export default NavLinks;