import React from "react";

import {
  AccordionSection,
  AccordionSubSection,
} from "@/app/view-data/utils/component-utils";

import { DataDisplay, DisplayDataProps } from "./DataDisplay";

interface SocialHistoryProps {
  socialData: DisplayDataProps[];
}

/**
 * Functional component for displaying social history.
 * @param props - Props for social history.
 * @param props.socialData - The fields to be displayed.
 * @returns The JSX element representing social history.
 */
const SocialHistory: React.FC<SocialHistoryProps> = ({ socialData }) => {
  return (
    <AccordionSection>
      <AccordionSubSection title="Social History">
        {socialData.map((item, index) => (
          <DataDisplay item={item} key={index} />
        ))}
      </AccordionSubSection>
    </AccordionSection>
  );
};

export default SocialHistory;
