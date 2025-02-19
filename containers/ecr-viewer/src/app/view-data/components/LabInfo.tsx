import { AccordionSection, AccordionSubSection } from "../component-utils";
import React from "react";
import {
  DataDisplay,
  DataTableDisplay,
  DisplayDataProps,
} from "@/app/view-data/components/DataDisplay";
import {
  isLabReportElementDataList,
  LabReportElementData,
} from "@/app/services/labsService";
import { ExpandCollapseButtons } from "./ExpandCollapseButtons";
import { toKebabCase } from "@/app/utils/format-utils";

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
  // This is to build the selector based off if orgId exists
  // Sometimes it doesn't, so we default to the base class
  // the orgId makes it so that when you have multiple, it can distinguish
  // which org it is modifying
  const accordionSelectorClass = labResult.organizationId
    ? `.accordion_${labResult.organizationId}`
    : ".accordion-rr";
  const buttonSelectorClass = labResult.organizationId
    ? `.acc_item_${labResult.organizationId}`
    : "h5";
  const labName = `Lab Results from ${
    labResult?.organizationDisplayDataProps?.[0]?.value ||
    "Unknown Organization"
  }`;
  return (
    <AccordionSubSection title={labName}>
      {labResult?.organizationDisplayDataProps?.map(
        (item: DisplayDataProps, index: any) => {
          if (item.value) return <DataDisplay item={item} key={index} />;
        },
      )}
      <div className="display-flex">
        <div className="margin-left-auto padding-top-1">
          <ExpandCollapseButtons
            id={`lab-info-${toKebabCase(labName)}`}
            buttonSelector={`${buttonSelectorClass} > .usa-accordion__button`}
            accordionSelector={`${accordionSelectorClass} > .usa-accordion__content`}
            expandButtonText="Expand all labs"
            collapseButtonText="Collapse all labs"
          />
        </div>
      </div>
      {labResult.diagnosticReportDataElements}
    </AccordionSubSection>
  );
};

export default LabInfo;
