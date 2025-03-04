"use client";

import { Button } from "@trussworks/react-uswds";
import { ArrowForward } from "@/app/components/Icon";
import { signIn } from "next-auth/react";
import { ProviderDetails } from "../../api/auth/auth";

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
          await signIn(provider.id, { callbackUrl: process.env.BASE_PATH });
        }}
      >
        Log in via {provider.name}
        <ArrowForward aria-hidden={true} size={3} />
      </Button>
    </>
  );
};
