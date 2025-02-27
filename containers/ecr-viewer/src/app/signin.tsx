"use client";

import { Button } from "@trussworks/react-uswds";
import { ArrowForward } from "@/app/components/Icon";
import bgRedirect from "../../assets/bg-redirect.png";
import { signIn } from "next-auth/react";
import { ProviderDetails } from "./api/auth/auth";

interface RedirectProps {
  provider: ProviderDetails;
}
/**
 * Redirect Component
 *
 * Returns a sign-in page for users trying to access the eCR Viewer.
 * @param props - The props object.
 * @param props.provider - Information about the provider.
 * @returns A styled div with prompt message and a login button that redirects users their authentication provider.
 */
export const Redirect = ({ provider }: RedirectProps) => {
  return (
    <div
      className="position-relative text-white"
      style={{
        backgroundImage: `url(${bgRedirect.src})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        minHeight: "100vh",
        minWidth: "100vw",
        overflowY: "auto",
        overflowX: "auto",
      }}
    >
      <div className="width-tablet position-absolute top-3950 left-12 padding-bottom-6 padding-right-6 grid-row gap-5">
        <h1 className="font-serif-3xl text-bold margin-0">
          Looks like you're trying to access the eCR Viewer
        </h1>
        <p className="font-sans-lg text-bold margin-0">
          You need to log in to see the eCR Viewer
        </p>
        <br />
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
      </div>
    </div>
  );
};
