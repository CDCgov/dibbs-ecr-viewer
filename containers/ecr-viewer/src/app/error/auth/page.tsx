import React from "react";

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
      <li>
        <b>Return to NBS:</b> Return to NBS and try to reopen the eCR.
      </li>
      <li>
        <b>Contact support:</b> If the problem persists, please reach out to
        your eCR coordinator.
      </li>
    </ul>
  </ErrorPage>
);

export default ErrorAuthPage;
