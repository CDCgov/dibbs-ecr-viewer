"use client";
import React, { useId, useState } from "react";

import classNames from "classnames";

import { AccordionItem } from "@/app/view-data/types";

import Accordion from "./AccordionControlled";
import { ExpandCollapseButtons } from "./ExpandCollapseButtons";

/**
 * Accordion where expand all/collapse all buttons are added above items
 * @param props react props
 * @param props.items accordion items to display
 * @param props.descriptor desciptor for expand/collapse button labels
 * @returns expandable/collapsable accordion
 */
export const ExpandCollapseAccordion = ({
  items,
  descriptor,
}: {
  items: AccordionItem[];
  descriptor: string;
}) => {
  const id = useId();

  // Make sure each accordion's items actually have unique IDs across the app
  const uniqueIdItems = items.map((item, i) => ({
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

  return (
    <>
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
            descriptor={descriptor}
          />
        </div>
      </div>
      <Accordion
        className="accordion-rr margin-bottom-3"
        items={accordionItems}
        toggleItem={handleToggle}
      />
    </>
  );
};
