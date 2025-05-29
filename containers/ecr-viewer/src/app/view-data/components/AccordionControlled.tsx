/**
 * File adapted from https://github.com/trussworks/react-uswds/tree/main/src/components/Accordion
 * under the Apache 2.0 License (https://github.com/trussworks/react-uswds/blob/main/LICENSE).
 *
 * The component has been adapted to move the state control from inside the component to the consuming site.
 */
import React from "react";

import { Checkbox } from "@trussworks/react-uswds";
import classnames from "classnames";

import { AccordionItem as AccordionItemProps } from "@/app/view-data/types";

type AccordionControlledItem = AccordionItemProps & {
  group?: string;
  isChecked?: () => boolean;
  onChecked?: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

type AccordionProps = {
  items: AccordionControlledItem[];
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
        <div
          key={`accordionItemWrapper-${item.id}`}
          className="display-flex flex-align-top margin-bottom-2"
        >
          {item.isChecked && item.onChecked && (
            <div className="margin-right-1 margin-top-3">
              <CheckboxItem
                id={item.id}
                group={item.group ?? "checkbox"}
                // label={item.id}
                isChecked={item.isChecked}
                onChecked={item.onChecked}
              />
            </div>
          )}
          <div className="flex-grow-1 width-full">
            <AccordionItem
              {...item}
              handleToggle={(): void => {
                toggleItem(item.id);
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default AccordionControlled;

type CheckboxItemProps = {
  id: string;
  group: string;
  isChecked: () => boolean;
  onChecked: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

const CheckboxItem = ({
  id,
  group,
  isChecked,
  onChecked,
}: CheckboxItemProps): React.ReactElement => (
  <div key={`${group}-${id}`}>
    <Checkbox
      id={`${group}-${id}`}
      name={`${group}s`}
      value={id}
      aria-label={`Checkbox for ${group}-${id}`} // TODO ANGELA: needs to be a human-readable string?
      label="" // TODO ANGELA: maybe make own checkbox component w/o label?
      checked={isChecked()}
      onChange={onChecked}
    />
  </div>
);

