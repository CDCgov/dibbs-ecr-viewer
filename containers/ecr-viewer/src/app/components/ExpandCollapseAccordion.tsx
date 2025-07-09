"use client";
import React, { useId, useState } from "react";

import classnames from "classnames";

import { AccordionItem } from "@/app/view-data/types";

import Accordion from "./AccordionControlled";
import { ExpandCollapseButtons } from "./ExpandCollapseButtons";

/**
 * Accordion where expand all/collapse all buttons are added above items
 * @param props react props
 * @param props.items accordion items to display
 * @param props.descriptor descriptor for expand/collapse button labels
 * @param props.className optionally, classes to pass to the Accordion component
 * @returns expandable/collapsable accordion
 */
export const ExpandCollapseAccordion = ({
  items,
  descriptor,
  className,
}: {
  items: AccordionItem[];
  descriptor: string;
  className?: string;
}) => {
  const id = useId();

  // Make sure each accordion's items actually have unique IDs across the app
  const uniqueIdItems = items.map((item, i) => ({
    ...item,
    id: `${item.id}-${id}-${i}`,
    className: classnames("side-nav-ignore", item.className),
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
    <ExpandCollapseAccordionControlled
      descriptor={descriptor}
      className={className}
      items={accordionItems}
      handleToggle={handleToggle}
      handleToggleAll={(expanded) =>
        setAccordionItems(accordionItems.map((item) => ({ ...item, expanded })))
      }
    />
  );
};

/**
 * Accordion where expand all/collapse all buttons are added above items
 * @param props react props
 * @param props.items accordion items to display
 * @param props.descriptor desciptor for expand/collapse button labels
 * @param props.handleToggle handler for toggling one accordion item
 * @param props.handleToggleAll handler for toggling all accordion items
 * @param props.className optionally, classes to pass to the Accordion component
 * @returns expandable/collapsable accordion
 */
export const ExpandCollapseAccordionControlled = ({
  items,
  className,
  descriptor,
  handleToggle,
  handleToggleAll,
}: {
  items: AccordionItem[];
  descriptor: string;
  handleToggle: (id: string) => void;
  handleToggleAll: (expanded: boolean) => void;
  className?: string;
}) => {
  return (
    <>
      <div className="display-flex">
        <div className="margin-left-auto padding-top-1">
          <ExpandCollapseButtons
            expandHandler={() => handleToggleAll(true)}
            collapseHandler={() => handleToggleAll(false)}
            descriptor={descriptor}
          />
        </div>
      </div>
      <Accordion
        className={className}
        items={items}
        toggleItem={handleToggle}
      />
    </>
  );
};
