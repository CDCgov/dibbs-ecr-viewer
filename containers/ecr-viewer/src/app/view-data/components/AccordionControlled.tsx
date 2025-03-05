/**
 * File adapted from https://github.com/trussworks/react-uswds/tree/main/src/components/Accordion
 * under the Apache 2.0 License (https://github.com/trussworks/react-uswds/blob/main/LICENSE).
 *
 * The component has been adapted to move the state control from inside the component to the consuming site.
 */
import React from "react";

import classnames from "classnames";

import { AccordionItem as AccordionItemProps } from "@/app/view-data/types";

type AccordionProps = {
  items: AccordionItemProps[];
  className?: string;
  toggleItem: (id: string) => void;
};

const AccordionItem = ({
  title,
  id,
  content,
  expanded,
  className,
  headingLevel,
  handleToggle,
}: AccordionItemProps): React.ReactElement => {
  const headingClasses = classnames("usa-accordion__heading", className);
  const contentClasses = classnames(
    "usa-accordion__content",
    "usa-prose",
    className,
  );

  const Heading = headingLevel;

  return (
    <>
      <Heading className={headingClasses}>
        <button
          type="button"
          className="usa-accordion__button"
          aria-expanded={expanded}
          aria-controls={id}
          data-testid={`accordionButton_${id}`}
          onClick={handleToggle}
        >
          {title}
        </button>
      </Heading>
      <div
        id={id}
        data-testid={`accordionItem_${id}`}
        className={contentClasses}
        hidden={!expanded}
      >
        {content}
      </div>
    </>
  );
};

/**
 * A version of the `@trussworks/react-uswds` `Accordion` component with the
 * state management left to the consuming site. This allows for control of the
 * expansion/collapsing of the items from outside the item itself.
 * @param props React props
 * @param props.items The accordion item descriptors
 * @param props.className optional class to ad to the outer accodion div
 * @param props.toggleItem function to handle the toggling of an items visibility
 * @returns The component
 */
export const AccordionControlled = ({
  items,
  className,
  toggleItem,
}: AccordionProps & JSX.IntrinsicElements["div"]): React.ReactElement => {
  return (
    <div
      className={classnames("usa-accordion", className)}
      data-testid="accordion"
      data-allow-multiple={true}
    >
      {items.map((item) => (
        <AccordionItem
          key={`accordionItem_${item.id}`}
          {...item}
          handleToggle={(): void => {
            toggleItem(item.id);
          }}
        />
      ))}
    </div>
  );
};

export default AccordionControlled;
