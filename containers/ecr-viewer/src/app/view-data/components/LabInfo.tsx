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
 * Functional component for displaying clinical information.
 * @param props - Props containing clinical information.
 * @param props.labResults - some props
 * @returns The JSX element representing the clinical information.
 */
export const LabInfo = ({ labResults }: LabInfoProps) => {
  return (
    <AccordionSection>
      {labResults.map((res, i) => (
        <LabResultDetail key={i} labResult={res} />
      ))}
    </AccordionSection>
  );
};

const LabResultDetail = ({
  labResult,
}: {
  labResult: LabReportElementData;
}) => {
  const labName = `Lab Results from ${
    labResult?.organizationDisplayDataProps?.[0]?.value ||
    "Unknown Organization"
  }`;

  return (
    <AccordionSubSection title={labName}>
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

export default LabInfo;
