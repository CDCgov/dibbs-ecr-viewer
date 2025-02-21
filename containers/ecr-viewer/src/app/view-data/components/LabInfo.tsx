"use client";
import React, { useState } from "react";
import { AccordionSection, AccordionSubSection } from "../component-utils";
import {
  DataDisplay,
  DataTableDisplay,
  DisplayDataProps,
} from "@/app/view-data/components/DataDisplay";
import { LabReportElementData } from "@/app/services/labsService";
import { ExpandCollapseButtons } from "./ExpandCollapseButtons";
import { LabAccordion } from "./LabAccordion";
import { isLabReportElementDataList } from "@/app/utils/lab-utils";

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
  const [accordionItems, setAccordionItems] = useState(
    labResult.diagnosticReportDataItems,
  );

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
            expandHandler={() =>
              setAccordionItems(
                accordionItems.map((item) => ({ ...item, expanded: true })),
              )
            }
            collapseHandler={() =>
              setAccordionItems(
                accordionItems.map((item) => ({ ...item, expanded: false })),
              )
            }
            descriptor="labs"
          />
        </div>
      </div>
      <LabAccordion
        // HACK: get this to re-render when items change
        key={Math.random()}
        items={accordionItems}
      />
    </AccordionSubSection>
  );
};

export default LabInfo;
