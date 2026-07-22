import React from "react";

import { ExpandCollapseAccordion } from "@/app/components/ExpandCollapseAccordion";
import { LabReportElementData } from "@/app/view-data/services/labsService";
import {
  AccordionSection,
  AccordionSubSection,
} from "@/app/view-data/utils/component-utils";

import { DataDisplay } from "./DataDisplay";

interface LabInfoProps {
  labResults: LabReportElementData[];
}

/**
 * Functional component for displaying lab information.
 * @param props - Props containing lab information.
 * @param props.labResults - some props
 * @returns The JSX element representing the lab information.
 */
export const LabInfo = ({ labResults }: LabInfoProps) => {
  return (
    <AccordionSection>
      {labResults.map((res, i) => (
        <LabResultDetail
          key={i}
          labResult={res}
          sectionId={res.subNavMetadata.id}
        />
      ))}
    </AccordionSection>
  );
};

const LabResultDetail = ({
  labResult,
  sectionId,
}: {
  labResult: LabReportElementData;
  sectionId: string;
}) => {
  return (
    <AccordionSubSection title={labResult.subNavMetadata.title} id={sectionId}>
      {labResult?.organizationDisplayDataProps?.map((item, index) => {
        if (item.value) return <DataDisplay item={item} key={index} />;
      })}
      <ExpandCollapseAccordion
        className="accordion-rr margin-bottom-3"
        items={labResult.diagnosticReportDataItems}
        descriptor="labs"
      />
    </AccordionSubSection>
  );
};

export type LabNavItem = {
  title: string;
  id: string;
};
