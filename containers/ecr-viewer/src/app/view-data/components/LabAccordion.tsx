import React, { useId } from "react";

import { Accordion } from "@trussworks/react-uswds";
import classNames from "classnames";

import { AccordionItem } from "@/app/view-data/types";

/**
 * Accordion component for displaying lab results.
 * @param props - The props object.
 * @param props.items - The accordion items to display.
 * @returns React element representing the LabAccordion component.
 */
export const LabAccordion = ({
  items,
}: {
  items: AccordionItem[];
}): React.JSX.Element => {
  const id = useId();

  // Make sure each accordion's items actually have unique IDs across the app
  const uniqueIdItems = items.map((item, i) => ({
    ...item,
    id: `${item.id}-${id}-${i}`,
    className: classNames("side-nav-ignore", item.className),
  }));

  return (
    <Accordion
      className="accordion-rr margin-bottom-3"
      items={uniqueIdItems}
      multiselectable={true}
    />
  );
};
