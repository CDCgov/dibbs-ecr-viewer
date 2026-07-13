import React from "react";

import {
  AccordionSection,
  AccordionSubSection,
} from "@/app/view-data/utils/component-utils";

import { DataDisplay, DataTableDisplay, DisplayDataProps } from "./DataDisplay";

interface EncounterInfoProps {
  encounterData: DisplayDataProps[];
  hospitalEncounterData: DisplayDataProps[];
  facilityData: DisplayDataProps[];
  providerData: DisplayDataProps[];
}

/**
 * Functional component for displaying Encounter Info section.
 * @param props - Props containing all encounter details.
 * @param props.encounterData - Encounter details to be displayed.
 * @param props.hospitalEncounterData - Hospital Encounter Diagnosis details to be displayed.
 * @param props.providerData - Provider details to be displayed.
 * @param props.facilityData - Facility details to be displayed.
 * @returns The JSX element representing the encounter details.
 */
const EncounterInfo = ({
  encounterData,
  hospitalEncounterData,
  facilityData,
  providerData,
}: EncounterInfoProps) => {
  return (
    <AccordionSection>
      <EncounterSection title="Encounter Details" data={encounterData} />
      <EncounterSection
        title="Hospital Encounter Details"
        data={hospitalEncounterData}
      />
      <EncounterSection
        title="Facility Details"
        toolTip="Specific healthcare facility where the encounter took place."
        data={facilityData}
      />
      <EncounterSection
        title="Provider Details"
        toolTip="Person or organization that provided care during the encounter."
        data={providerData}
      />
    </AccordionSection>
  );
};

const EncounterSection = ({
  title,
  data,
  toolTip,
}: {
  title: string;
  toolTip?: string;
  data: DisplayDataProps[];
}) => {
  return (
    data.length > 0 && (
      <AccordionSubSection title={title} toolTip={toolTip}>
        {data.map((item, index) => {
          if (item.table) {
            return <DataTableDisplay item={item} key={index} />;
          } else {
            return <DataDisplay item={item} key={index} />;
          }
        })}
      </AccordionSubSection>
    )
  );
};
export default EncounterInfo;
