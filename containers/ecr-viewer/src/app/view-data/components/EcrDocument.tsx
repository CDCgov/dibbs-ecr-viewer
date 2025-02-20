"use client";
import React, { useState } from "react";
import { Accordion, Grid, GridContainer } from "@trussworks/react-uswds";
import { AccordionItem } from "@/app/services/accordionItemService";
import { ExpandCollapseButtons } from "./ExpandCollapseButtons";

/**
 * The body of the eCR document
 * @param params React params
 * @param params.initialAccordionItems Initial state of the accordion items
 * @returns ecr document component
 */
export const EcrDocument = ({
  initialAccordionItems,
}: {
  initialAccordionItems: AccordionItem[];
}) => {
  const [accordionItems, setAccordionItems] = useState(initialAccordionItems);
  return (
    <div className="margin-top-10">
      <GridContainer className={"padding-0 margin-bottom-3 maxw-none"}>
        <Grid row className="margin-bottom-05">
          <Grid>
            <h2 className="margin-bottom-0" id="ecr-document">
              eCR Document
            </h2>
          </Grid>
          <Grid className={"flex-align-self-center margin-left-auto"}>
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
              descriptor="sections"
            />
          </Grid>
        </Grid>
        <div className="text-base-darker line-height-sans-5">
          Displays entire eICR and RR documents to help you dig further into eCR
          data
        </div>
      </GridContainer>
      <Accordion
        // HACK: get this to re-render when items change
        key={Math.random()}
        className="info-container"
        items={accordionItems}
        multiselectable
      />
    </div>
  );
};
