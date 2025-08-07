import {
  AccordionSection,
  AccordionSubSection,
} from "@/app/view-data//utils/component-utils";

import { DataDisplay, DisplayDataProps } from "./DataDisplay";

interface PregnancyInfoProps {
  pregnancyData: DisplayDataProps;
}

/**
 * PregnancyInfo component displays pregnancy-related information.
 * @param root0 - The props object.
 * @param root0.pregnancyData - The pregnancy data to be displayed.
 * @returns The rendered component.
 */
const PregnancyInfo: React.FC<PregnancyInfoProps> = ({ pregnancyData }) => {
  return (
    <AccordionSection>
      <AccordionSubSection
        title="Pregnancy Info"
        toolTip="Pregnancy info displays the most recent observations at the top. This section may list multiple pregnancies."
      >
        <DataDisplay item={pregnancyData} />
      </AccordionSubSection>
    </AccordionSection>
  );
};

export default PregnancyInfo;
