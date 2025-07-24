"use client";
import { Button } from "@trussworks/react-uswds";

import { useIsLoggedInUser } from "./AuthSessionProvider";
import { signOutGoHome } from "./AutoSignout";

/**
 * @returns Sign out button if user is signed in
 */
export const SignOutButton = () => {
  const loggedIn = useIsLoggedInUser();

  return (
    loggedIn && (
      <Button
        type="button"
        unstyled={true}
        className="flex-align-self-center sign-out-button action-text"
        onClick={signOutGoHome}
      >
        Sign Out
      </Button>
    )
  );
};
