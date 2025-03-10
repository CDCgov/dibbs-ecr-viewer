"use client";

import { Button } from "@trussworks/react-uswds";
import { signIn } from "next-auth/react";

import { ProviderDetails } from "@/app/api/auth/auth";
import { ArrowForward } from "@/app/components/Icon";

interface RedirectProps {
  provider: ProviderDetails;
}
/**
 * Redirect Button component
 *
 * Returns a button that redirects users to a sign-in page to access the eCR Viewer.
 * @param props - The props object.
 * @param props.provider - Information about the provider.
 * @returns A styled sign-in button that redirects users their authentication provider.
 */
export const RedirectButton = ({ provider }: RedirectProps) => {
  return (
    <>
      <Button
        className="redirect-button"
        type="button"
        onClick={async () => {
          await signIn(provider.id);
        }}
      >
        Sign in via {provider.name}
        <ArrowForward aria-hidden={true} size={3} />
      </Button>
    </>
  );
};
