import React from "react";

import { BackButton } from "./BackButton";
import { Error } from "./Icon";

/**
 * @param props React props
 * @param props.title The title of the error
 * @param props.subTitle The sub title of the error
 * @param props.children The content to show to the user on what to do about the error
 * @returns The ecr retrieval error page JSX component.
 */
const ErrorPage = ({
  title,
  subTitle,
  children,
}: {
  title: string;
  subTitle?: string;
  children: React.ReactNode;
}) => (
  <div className="height-viewport-header-footer width-viewport display-flex flex-column">
    <main className="display-flex flex-justify-center height-full">
      <div className="display-inline-block margin-y-auto">
        <h2 className="font-family-serif font-serif-xl margin-bottom-0">
          <Error
            size={5}
            className="margin-right-105 text-middle"
            aria-hidden={true}
          />
          {title}
        </h2>
        <div className="text-semibold font-sans-md margin-top-1">
          {subTitle}
        </div>
        <div className="bg-info-lighter border border-info-light radius-md font-sans-md line-height-sans-4 padding-3 margin-top-2 width-tablet error-message-content">
          {children}
        </div>
        <BackButton className="margin-top-3 font-sans-md text-primary" />
      </div>
    </main>
  </div>
);

/**
 * @returns The ecr retrieval error page JSX component.
 */
export const RetrievalFailed = () => (
  <ErrorPage
    title="eCR retrieval failed"
    subTitle="The eCR Viewer couldn't retrieve the associated eCR file"
  >
    <p>This is likely because the DIBBs pipeline hasn't processed this eCR.</p>
    <p>
      <b>Contact support:</b> If the problem persists, please reach out to your
      eCR coordinator to troubleshoot the issue with the DIBBs team.
    </p>
  </ErrorPage>
);

/**
 * @param props The react props
 * @param props.children Content to display to the user with more details on the error
 * @returns The ecr retrieval error page JSX component.
 */
export const GenericError = ({ children }: { children?: React.ReactNode }) => (
  <ErrorPage title="Something went wrong!">
    {children}

    <p>
      If the problem persists, please reach out to your eCR coordinator to
      troubleshoot the issue with the DIBBs team.
    </p>
  </ErrorPage>
);

/**
 * @returns The metadata db invalid error page JSX component.
 */
export const MetadataDbInvalid = () => (
  <ErrorPage title="eCR Viewer setup is incomplete">
    <p>
      The database backing this page isn't fully set up. Reach out to your eCR
      Viewer admin to complete setup.
    </p>
  </ErrorPage>
);

/**
 * @returns The metadata db invalid error page JSX component.
 */
export const StandardUserNoPrograms = () => (
  <ErrorPage title="Your user setup is incomplete">
    <p>
      To be able to view eCRs, you must be added to at least one program area.
      Reach out out to your eCR Viewer admin to complete setup.
    </p>
  </ErrorPage>
);

export default ErrorPage;
