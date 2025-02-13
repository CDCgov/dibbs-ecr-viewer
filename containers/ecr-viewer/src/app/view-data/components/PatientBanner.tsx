import React from "react";

interface PatientBannerProps {
  name: string | undefined;
  dob: string | undefined;
}

/**
 * Generates a JSX element to display patient name and date of birth in a sticky banner. Only shown in the integrated viewer.
 * @param props - Properties for the Patient Banner
 * @param props.name - The name to display
 * @param props.dob - The date of birth to display
 * @returns a react element for Patient Banner
 */
const PatientBanner = ({ name, dob }: PatientBannerProps) => {
  return (
    <div className="patient-banner">
      <span className="patient-banner-name">{name}</span>
      <span className="patient-banner-dob">{dob}</span>
    </div>
  );
};

export default PatientBanner;
