import { Bundle } from "fhir/r4";

import { ExpandCollapseAccordion } from "@/app/components/ExpandCollapseAccordion";
// import { evaluateOne } from "@/app/utils/evaluate";
// import fhirPathMappings from "@/app/utils/evaluate/fhir-paths";
import {
  AccordionSection,
  AccordionSubSection,
} from "@/app/view-data/component-utils";
import { AccordionItem as AccordionItemProps } from "@/app/view-data/types";

import { DataTableDisplay, DisplayDataProps } from "./DataDisplay";

interface PregnancyInfoProps {
  pregnancyData: AccordionItemProps[];
}

const getFormattedPregnancyContent = (fhirBundle: Bundle) => {
  const content: DisplayDataProps[] = [
    // {
    //   title: "Pregnancy Status",
    //   value: evaluateOne(fhirBundle, fhirPathMappings.pregnancyStatus),
    // }
  ];

  return content;
};

// const evaluatePregnancyData = () => {
//   const content = getFormattedPregnancyContent();
// }

/**
 * PregnancyInfo component displays pregnancy-related information.
 * @param root0 - The props object.
 * @param root0.pregnancyData - The pregnancy data to be displayed.
 * @returns The rendered component.
 */
const PregnancyInfo: React.FC<PregnancyInfoProps> = ({ pregnancyData }) => {
  return (
    <AccordionSection>
      <AccordionSubSection title="Pregnancy Info">
        {pregnancyData.map((item, index) => {
          return <DataTableDisplay item={item} key={index} />;
        })}
        <ExpandCollapseAccordion
          className="accordion-rr margin-bottom-3"
          items={pregnancyData}
          descriptor="labs"
        />
      </AccordionSubSection>
    </AccordionSection>
  );
};

export default PregnancyInfo;
