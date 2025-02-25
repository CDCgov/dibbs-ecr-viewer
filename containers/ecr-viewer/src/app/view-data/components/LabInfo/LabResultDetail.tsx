"use client";
import React, { useId, useState } from "react";
import { LabReportElementData } from "@/app/services/labsService";
import { AccordionSubSection } from "../../component-utils";
import { DataDisplay, DisplayDataProps } from "../DataDisplay";
import { ExpandCollapseButtons } from "../ExpandCollapseButtons";
import Accordion from "../AccordionControlled";
import classNames from "classnames";

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
  const id = useId();

  // Make sure each accordion's items actually have unique IDs across the app
  const uniqueIdItems = labResult.diagnosticReportDataItems.map((item, i) => ({
    ...item,
    id: `${item.id}-${id}-${i}`,
    className: classNames("side-nav-ignore", item.className),
  }));

  const [accordionItems, setAccordionItems] = useState(uniqueIdItems);

  const handleToggle = (id: string) => {
    const nextItems = accordionItems.map((item) => {
      if (item.id === id) {
        return { ...item, expanded: !item.expanded };
      }
      return item;
    });

    setAccordionItems(nextItems);
  };

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
      <Accordion
        className="accordion-rr margin-bottom-3"
        items={accordionItems}
        toggleItem={handleToggle}
      />
    </AccordionSubSection>
  );
};

export default LabResultDetail;
