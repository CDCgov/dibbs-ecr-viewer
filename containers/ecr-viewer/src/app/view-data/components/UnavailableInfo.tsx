import React from "react";

import {
  AccordionSection,
  AccordionSubSection,
} from "@/app/view-data/component-utils";

import { DataDisplay, DisplayDataProps } from "./DataDisplay";

interface UnavailableInfoProps {
  demographicsUnavailableData: DisplayDataProps[];
  socialUnavailableData: DisplayDataProps[];
  encounterUnavailableData: DisplayDataProps[];
  facilityUnavailableData: DisplayDataProps[];
  providerUnavailableData: DisplayDataProps[];
  symptomsProblemsUnavailableData: DisplayDataProps[];
  vitalUnavailableData: DisplayDataProps[];
  treatmentData: DisplayDataProps[];
  clinicalNotesData: DisplayDataProps[];
  immunizationsUnavailableData: DisplayDataProps[];
  ecrMetadataUnavailableData: DisplayDataProps[];
  eicrAuthorDetails: DisplayDataProps[][];
}

/**
 * Function component for displaying data that is unavailable in the eCR viewer.
 * @param props The properties for unavailable information
 * @param props.demographicsUnavailableData The unavailable demographic data
 * @param props.socialUnavailableData The unavailable social data
 * @param props.encounterUnavailableData The unavailable encounter data
 * @param props.facilityUnavailableData The unavailable facility data
 * @param props.providerUnavailableData The unavailable provider data
 * @param props.symptomsProblemsUnavailableData The unavailable symptoms and problems data
 * @param props.immunizationsUnavailableData The unavailable immunizations data
 * @param props.vitalUnavailableData The unavailable vital data
 * @param props.treatmentData The unavailable treatment data
 * @param props.clinicalNotesData The unavailable clinical notes
 * @param props.ecrMetadataUnavailableData The unavailable ecr meta data
 * @param props.eicrAuthorDetails The unavailable eicrAuthorDetails
 * @returns The JSX element representing all unavailable data.
 */
const UnavailableInfo: React.FC<UnavailableInfoProps> = ({
  demographicsUnavailableData,
  socialUnavailableData,
  encounterUnavailableData,
  facilityUnavailableData,
  providerUnavailableData,
  symptomsProblemsUnavailableData,
  immunizationsUnavailableData,
  vitalUnavailableData,
  treatmentData,
  clinicalNotesData,
  ecrMetadataUnavailableData,
  eicrAuthorDetails,
}) => {
  return (
    <AccordionSection>
      <UnavailableSection
        title="Demographics"
        data={demographicsUnavailableData}
      />
      <UnavailableSection title="Social History" data={socialUnavailableData} />
      <UnavailableSection
        title="Encounter Details"
        data={encounterUnavailableData}
      />
      <UnavailableSection
        title="Facility Details"
        data={facilityUnavailableData}
      />
      <UnavailableSection title="Clinical Notes" data={clinicalNotesData} />
      <UnavailableSection
        title="Provider Details"
        data={providerUnavailableData}
      />
      <UnavailableSection
        title="Symptoms and Problems"
        data={symptomsProblemsUnavailableData}
      />
      <UnavailableSection
        title="Diagnostics and  Vital Signs"
        data={vitalUnavailableData}
      />
      <UnavailableSection
        title="Immunizations"
        data={immunizationsUnavailableData}
      />
      <UnavailableSection title="Treatment Details" data={treatmentData} />
      <UnavailableSection
        title="eCR Metadata"
        data={ecrMetadataUnavailableData}
      />
      {eicrAuthorDetails?.map((authorDetails, index) => (
        <UnavailableSection
          key={index}
          title="eICR Author Details for Practitioner"
          data={authorDetails}
        />
      ))}
    </AccordionSection>
  );
};

const UnavailableSection = ({
  title,
  data,
}: {
  title: string;
  data: DisplayDataProps[];
}) => {
  return (
    data.length > 0 && (
      <AccordionSubSection title={title} idPrefix="unavailable-">
        {data.map((item, index) => (
          <DataDisplay
            item={{ ...item, value: "No data" }}
            className="text-italic text-base"
            key={index}
          />
        ))}
      </AccordionSubSection>
    )
  );
};

export default UnavailableInfo;
