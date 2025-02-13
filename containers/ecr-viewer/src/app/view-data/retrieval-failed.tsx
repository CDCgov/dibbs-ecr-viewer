import React from "react";
import { Error } from "@/app/components/Icon";
import Header from "../Header";
import { BackButton } from "./components/BackButton";

/**
 * @returns The ecr retrieval error page JSX component.
 */
const RetrievalFailed = () => (
  <div className="height-viewport width-viewport display-flex flex-column">
    <Header />
    <main className="display-flex flex-justify-center height-full">
      <div className="display-inline-block margin-y-auto">
        <h2 className="font-family-serif font-serif-xl margin-bottom-0">
          <Error
            size={5}
            className="margin-right-105 text-middle"
            aria-hidden
          />
          eCR retrieval failed
        </h2>
        <div className="text-semibold font-sans-md margin-top-1">
          The eCR Viewer couldn't retrieve the associated eCR file
        </div>
        <div className="bg-info-lighter border border-info-light radius-md font-sans-md line-height-sans-4 padding-3 margin-top-2">
          This is likely because the DIBBs pipeline hasn't processed this eCR.
          <p />
          <div className="margin-0">
            <b>Contact support:</b> If the problem persists, please reach out to
            your eCR coordinator
            <br /> to troubleshoot the issue with the DIBBs team.
          </div>
        </div>
        <BackButton className="margin-top-3 font-sans-md text-primary" />
      </div>
    </main>
  </div>
);

export default RetrievalFailed;
