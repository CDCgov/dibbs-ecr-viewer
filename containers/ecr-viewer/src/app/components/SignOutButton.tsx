"use client";
import { Button } from "@trussworks/react-uswds";
import { signOut } from "next-auth/react";

import { useIsLoggedInUser } from "./AuthSessionProvider";

/**
 * @returns Sign out button if user is signed in
 */
export const SignOutButton = () => {
  const loggedIn = useIsLoggedInUser();

  return (
    loggedIn && (
      <Button
        type="button"
        className="flex-align-self-center"
        onClick={() => signOut({ callbackUrl: `/ecr-viewer` })}
      >
        Sign Out
      </Button>
    )
  );
};
