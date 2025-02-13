import React from "react";
import { Accordion, HeadingLevel } from "@trussworks/react-uswds";
import { toKebabCase } from "@/app/utils/format-utils";
import { RenderableNode } from "@/app/utils/data-utils";

export interface AccordionItemProps {
  title: RenderableNode;
  content: React.ReactNode;
  expanded: boolean;
  id: string;
  className?: string;
  headingLevel: HeadingLevel;
  handleToggle?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

type AccordionContainerProps = {
  accordionItems: AccordionItemProps[];
};

/**
 * Functional component for an accordion container displaying various sections of eCR information.
 * @param props - Props containing FHIR bundle and path mappings.
 * @param props.accordionItems - The list of accordion items.
 * @returns The JSX element representing the accordion container.
 */
const AccordionContainer = ({
  accordionItems,
}: AccordionContainerProps): React.JSX.Element => {
  const items: AccordionItemProps[] = accordionItems.map((item, index) => {
    let formattedTitle = toKebabCase(`${item["title"]}`);
    return {
      ...item,
      id: `${formattedTitle}_${index + 1}`,
      title: <span id={formattedTitle}>{item["title"]}</span>,
    };
  });

  return (
    <Accordion
      className="info-container"
      items={items}
      multiselectable={true}
    />
  );
};
export default AccordionContainer;
