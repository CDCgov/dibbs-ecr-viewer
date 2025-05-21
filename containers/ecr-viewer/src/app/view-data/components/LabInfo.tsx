import React from "react";

import {
  LabReportElementData,
  isLabReportElementDataList,
} from "@/app/services/labsService";
import {
  AccordionSection,
  AccordionSubSection,
} from "@/app/view-data/component-utils";

import { DataDisplay, DataTableDisplay, DisplayDataProps } from "./DataDisplay";
import { ExpandCollapseAccordion } from "./ExpandCollapseAccordion";

interface LabInfoProps {
  labResults: DisplayDataProps[] | LabReportElementData[];
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
      {labResults &&
        (isLabReportElementDataList(labResults) ? (
          (labResults as LabReportElementData[]).map((res, i) => (
            <LabResultDetail key={i} labResult={res} />
          ))
        ) : (
          <HtmlLabResult labResult={labResults[0] as DisplayDataProps} />
        ))}
    </AccordionSection>
  );
};

const HtmlLabResult = ({ labResult }: { labResult: DisplayDataProps }) => {
  return (
    <AccordionSubSection title="Lab Results">
      <div data-testid="lab-results">
        <DataTableDisplay item={labResult} />
      </div>
    </AccordionSubSection>
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
