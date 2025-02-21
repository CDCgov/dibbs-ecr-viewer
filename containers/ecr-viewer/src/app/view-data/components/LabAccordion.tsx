import React, { useId } from "react";
import { AccordionItem } from "@/app/view-data/types";
import { Accordion } from "@trussworks/react-uswds";

/**
 * Accordion component for displaying lab results.
 * @param props - The props object.
 * @param props.items - The title of the lab result.
 * @returns React element representing the AccordionLabResults component.
 */
export const LabAccordion = ({
  items,
}: {
  items: AccordionItem[];
}): React.JSX.Element => {
  const id = useId();

  // Make sure each accordion's items actually have unique IDs across the app
  const uniqueIdItems = items.map((item) => ({
    ...item,
    id: `${item.id}-${id}`,
  }));

  return (
    <Accordion
      items={uniqueIdItems}
      className="accordion-rr margin-bottom-3"
      multiselectable
    />
  );
};
