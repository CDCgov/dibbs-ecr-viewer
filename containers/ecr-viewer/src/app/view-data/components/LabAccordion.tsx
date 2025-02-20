import { AccordionItem } from "@/app/services/accordionItemService";
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
  return (
    <Accordion
      items={items}
      className="accordion-rr margin-bottom-3"
      multiselectable
    />
  );
};
