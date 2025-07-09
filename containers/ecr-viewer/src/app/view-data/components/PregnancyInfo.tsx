import { ReactNode } from "react";

import { evaluateData } from "@/app/utils/data-utils";
import {
  AccordionSection,
  AccordionSubSection,
} from "@/app/view-data/component-utils";

import { DataDisplay } from "./DataDisplay";

interface PregnancyInfoProps {
  pregnancyData: ReactNode;
}

/**
 * PregnancyInfo component displays pregnancy-related information.
 * @param root0 - The props object.
 * @param root0.pregnancyData - The pregnancy data to be displayed.
 * @returns The rendered component.
 */
const PregnancyInfo: React.FC<PregnancyInfoProps> = ({ pregnancyData }) => {
  const dataDisplay = evaluateData([
    { title: "Pregnancy", value: pregnancyData, fullWidthContent: true },
  ]).availableData[0];
  return (
    <AccordionSection>
      <AccordionSubSection title="Pregnancy Info">
        <DataDisplay item={dataDisplay} />
      </AccordionSubSection>
    </AccordionSection>
  );
};

export default PregnancyInfo;
