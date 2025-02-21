"use client";
import React, { useState } from "react";
import { LabReportElementData } from "@/app/services/labsService";
import { AccordionSubSection } from "../../component-utils";
import { DataDisplay, DisplayDataProps } from "../DataDisplay";
import { ExpandCollapseButtons } from "../ExpandCollapseButtons";
import { LabAccordion } from "../LabAccordion";

/**
 * Helper component for building lab result accordions
 * @param props React props
 * @param props.labResult Lab report data
 * @returns Lab result details component
 */
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
      <LabAccordion items={accordionItems} />
    </AccordionSubSection>
  );
};

export default LabResultDetail;
