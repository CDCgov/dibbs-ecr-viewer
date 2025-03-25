import React from "react";

import Header from "@/app/components/Header";

import PatientBanner from "./PatientBanner";

/**
 * Layout component for the ecr viewer page.
 * @param props react props
 * @param props.patientName name to display in banner
 * @param props.patientDOB date of birth to display in banner
 * @param props.children Content inside the layout
 * @returns laid out ecr viewer
 */
export const ECRViewerLayout = ({
  patientName,
  patientDOB,
  children,
}: {
  patientName?: string;
  patientDOB?: string;
  children: React.ReactNode;
}) => {
  return (
    <main className="width-full minw-main">
      <Header />
      <PatientBanner name={patientName} dob={patientDOB} />
      <div className="main-container">
        <div className="width-main padding-main">
          <div className="content-wrapper">{children}</div>
        </div>
      </div>
      <a
        className="usa-button position-fixed right-3 bottom-0"
        target="_blank"
        title="External link opens in new window"
        href="https://touchpoints.app.cloud.gov/touchpoints/e93de6ae/submit"
      >
        How can we improve eCR Viewer?
      </a>
    </main>
  );
};
