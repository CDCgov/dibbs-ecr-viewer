"use client";

import { Button } from "@trussworks/react-uswds";
import { ArrowForward } from "@/app/components/Icon";
import bgRedirect from "../../../../../assets/bg-redirect.png";
import { signIn } from "next-auth/react";

/**
 * Redirect Component
 *
 * Returns a login page for users trying to access the eCR Viewer.
 * @returns A styled div with prompt message and a login button that redirects users to Azure AD authentication.
 */
export const Redirect = () => {
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
          aria-label={`Log in via Azure AD`}
          className={`redirect-button`}
          type="button"
          onClick={async () => {
            await signIn("azure-ad");
          }}
        >
          Log in via Azure AD
          <ArrowForward aria-hidden size={3} />
        </Button>
      </div>
    </div>
  );
};
