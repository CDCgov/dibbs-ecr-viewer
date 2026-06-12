import React from "react";

import Link from "next/link";

import ErrorPage from "@/app/components/ErrorPage";

/**
 * @returns The error auth page JSX component.
 */
const ErrorAuthPage = () => (
  <ErrorPage
    title="Authentication failed"
    subTitle="Check your credentials and try again."
  >
    Please try the following:
    <ul className="margin-0 padding-left-3">
      {(process.env.JWT_PUB_KEY || process.env.NBS_PUB_KEY) && (
        <li>
          <b>Return to your case management system:</b> Return and try to reopen
          the eCR.
        </li>
      )}
      {process.env.AUTH_PROVIDER && (
        <li>
          <b>Log in again:</b> Go to <Link href="/">the eCR Library</Link> and
          try logging in again.
        </li>
      )}
      <li>
        <b>Contact support:</b> If the problem persists, please reach out to
        your eCR coordinator.
      </li>
    </ul>
  </ErrorPage>
);

export default ErrorAuthPage;
