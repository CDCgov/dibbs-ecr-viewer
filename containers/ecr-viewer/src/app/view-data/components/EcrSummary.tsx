import React from "react";
import {
  DataDisplay,
  DataTableDisplay,
  DisplayDataProps,
} from "@/app/view-data/components/DataDisplay";
import { Accordion, Tag } from "@trussworks/react-uswds";
import { AccordionItem } from "@/app/view-data/types";
import { toKebabCase } from "@/app/utils/format-utils";

interface EcrSummaryProps {
  patientDetails: DisplayDataProps[];
  encounterDetails: DisplayDataProps[];
  conditionSummary: ConditionSummary[];
  snomed?: string;
}

export interface ConditionSummary {
  title: string;
  snomed: string;
  conditionDetails: DisplayDataProps[];
  clinicalDetails: DisplayDataProps[];
  labDetails: DisplayDataProps[];
  immunizationDetails: DisplayDataProps[];
}

/**
 * Generates a JSX element to display eCR viewer summary
 * @param props - Properties for the eCR Viewer Summary section
 * @param props.patientDetails - Array of title and values to be displayed in patient details section
 * @param props.encounterDetails - Array of title and values to be displayed in encounter details section
 * @param props.conditionSummary - Array of condition details
 * @param props.snomed - SNOMED code being requested
 * @returns a react element for ECR Summary
 */
const EcrSummary: React.FC<EcrSummaryProps> = ({
  patientDetails,
  encounterDetails,
  conditionSummary,
  snomed,
}) => {
  const conditionSummaryAccordionItems: AccordionItem[] = conditionSummary.map(
    (condition) => {
      return {
        title: condition.title,
        id: toKebabCase(condition.title),
        headingLevel: "h4",
        className: "side-nav-ignore border-1px border-accent-cool-darker",
        expanded: snomed === condition.snomed || conditionSummary.length === 1,
        content: (
          <>
            {condition.conditionDetails.map((item) => (
              <DataDisplay item={item} key={item.title} />
            ))}
            <h5
              className="text-bold margin-top-0 margin-bottom-1"
              id="relevant-clinical"
            >
              Clinical Sections Relevant to Reportable Condition
            </h5>
            {condition.immunizationDetails.length > 0 && (
              <div className={"margin-top-0"}>
                {condition.immunizationDetails.map((item, index) => (
                  <DataTableDisplay item={item} key={index} />
                ))}
              </div>
            )}
            <div className={"margin-top-0"}>
              {condition.clinicalDetails.map((item, index) => (
                <DataTableDisplay item={item} key={`${item.title}-${index}`} />
              ))}
            </div>
            <h5
              className="text-bold margin-0 margin-bottom-1"
              id="relevant-labs"
            >
              Lab Results Relevant to Reportable Condition
            </h5>
            <div className="margin-top-0">
              {condition.labDetails.map((item, index) => (
                <DataTableDisplay item={item} key={`${item.title}-${index}`} />
              ))}
            </div>
          </>
        ),
      };
    },
  );
  return (
    <div
      className="usa-summary-box padding-3"
      aria-labelledby="summary-box-key-information"
    >
      <div className="usa-summary-box__body margin-bottom-05">
        <h3
          className="summary-box-key-information side-nav-ignore"
          id={"patient-summary"}
        >
          Patient Summary
        </h3>
        <div className="usa-summary-box__text">
          {patientDetails.map((item) => (
            <DataDisplay item={item} key={item.title} themeColor="blue" />
          ))}
        </div>
      </div>
      <div className="usa-summary-box__body">
        <h3
          className="summary-box-key-information side-nav-ignore"
          id="encounter-summary"
        >
          Encounter Summary
        </h3>
        <div className="usa-summary-box__text">
          {encounterDetails.map((item) => (
            <DataDisplay item={item} key={item.title} themeColor="blue" />
          ))}
        </div>
      </div>
      <div className="usa-summary-box__body">
        <h3
          className={
            "summary-box-key-information side-nav-ignore header-with-tag"
          }
          id={"condition-summary"}
        >
          <div>Condition Summary</div>
          <div>
            <Tag className="tag-info">
              {numConditionsText(conditionSummaryAccordionItems.length)}
            </Tag>
          </div>
        </h3>
        <div className="usa-summary-box__text condition-details-accordion">
          <Accordion items={conditionSummaryAccordionItems} />
        </div>
      </div>
    </div>
  );
};

/**
 * Returns a formatted string indicating the number of reportable conditions.
 * @param numConditions - Number of conditions.
 * @returns A formatted string that specifies the number of conditions found.
 */
const numConditionsText = (numConditions: number) => {
  return numConditions === 1
    ? `${numConditions} CONDITION FOUND`
    : `${numConditions} CONDITIONS FOUND`;
};

export default EcrSummary;
