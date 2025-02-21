"use client";
import React, { useId, useState } from "react";
import { AccordionItem } from "@/app/view-data/types";
import Accordion from "@/app/view-data/components/AccordionControlled";
import classNames from "classnames";

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
  const uniqueIdItems = items.map((item) => ({
    ...item,
    id: `${item.id}-${id}`,
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

  return (
    <Accordion
      className="accordion-rr margin-bottom-3"
      items={accordionItems}
      toggleItem={handleToggle}
    />
  );
};
