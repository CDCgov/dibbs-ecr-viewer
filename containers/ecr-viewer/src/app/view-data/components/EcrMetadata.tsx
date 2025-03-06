import React from "react";

import { Table } from "@trussworks/react-uswds";

import {
  ERSDWarning,
  ReportableConditions,
} from "@/app/services/ecrMetadataService";
import {
  AccordionSection,
  AccordionSubSection,
} from "@/app/view-data/component-utils";

import { DataDisplay, DisplayDataProps } from "./DataDisplay";
import { ToolTipElement } from "./ToolTipElement";

interface EcrMetadataProps {
  rrDetails: ReportableConditions;
  eicrDetails: DisplayDataProps[];
  eRSDWarnings: ERSDWarning[];
  eCRCustodianDetails: DisplayDataProps[];
  eicrAuthorDetails: DisplayDataProps[][];
}

/**
 * Functional component for displaying eCR metadata.
 * @param props - Props containing eCR metadata.
 * @param props.rrDetails - The reportable conditions details.
 * @param props.eicrDetails - The eICR details.
 * @param props.eRSDWarnings - The eRSD warnings.
 * @param props.eCRCustodianDetails - The eCR custodian details.
 * @param props.eicrAuthorDetails - The eICR author details.
 * @returns The JSX element representing the eCR metadata.
 */
const EcrMetadata = ({
  rrDetails,
  eicrDetails,
  eRSDWarnings,
  eCRCustodianDetails,
  eicrAuthorDetails,
}: EcrMetadataProps) => {
  return (
    <AccordionSection>
      <AccordionSubSection title="RR Details">
        <ReportabilitySummary rrDetails={rrDetails} />
        <div className="section__line_gray" />
        {eRSDWarnings?.length > 0 && (
          <div>
            <Table
              bordered={false}
              className="ersd-table fixed-table border-top border-left border-right border-bottom"
              fixed={true}
              fullWidth={true}
            >
              <caption>
                <ToolTipElement toolTip="Can be used to help you identify healthcare providers that need to update their eRSD (Electronic Reporting and Surveillance Distribution) version.">
                  eRSD Warnings
                </ToolTipElement>
              </caption>
              <thead>
                <tr>
                  <th>Warning</th>
                  <th>Version in Use</th>
                  <th>Expected Version</th>
                  <th>Suggested Solution</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(eRSDWarnings) &&
                  eRSDWarnings.map((warningItem, index) => (
                    <tr key={index}>
                      <td className="padding-105">{warningItem.warning}</td>
                      <td className="padding-105">{warningItem.versionUsed}</td>
                      <td className="padding-105">
                        {warningItem.expectedVersion}
                      </td>
                      <td className="padding-105">
                        {warningItem.suggestedSolution}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </Table>
            <div className="section__line_gray"></div>
          </div>
        )}
      </AccordionSubSection>

      <AccordionSubSection title="eICR Details">
        {eicrDetails.map((item, index) => {
          return <DataDisplay item={item} key={index} />;
        })}
      </AccordionSubSection>

      {eicrAuthorDetails?.map((authorDetailsDisplayProps, i) => {
        return (
          <AccordionSubSection
            key={`author-${i}`}
            title="eICR Author Details for Practitioner"
          >
            {authorDetailsDisplayProps.map((item, j) => {
              return <DataDisplay item={item} key={`author-details-${j}`} />;
            })}
          </AccordionSubSection>
        );
      })}

      <AccordionSubSection
        title="eICR Custodian Details"
        toolTip="Person or organization that generated the eICR Document."
      >
        {eCRCustodianDetails.map((item, index) => {
          return <DataDisplay item={item} key={index} />;
        })}
      </AccordionSubSection>
    </AccordionSection>
  );
};

type ReportabilitySummaryProps = Pick<EcrMetadataProps, "rrDetails">;

const ReportabilitySummary: React.FC<ReportabilitySummaryProps> = ({
  rrDetails,
}) => {
  const rows = useConvertDictionaryToRows(rrDetails);

  if (rows.length === 0) {
    return (
      <div>
        <h5 className="header-data-title">Reportability Summary</h5>
        <p className="no-data text-italic text-base padding-bottom-0">
          No reportable condition found
        </p>
      </div>
    );
  }

  return (
    <Table
      bordered={true}
      caption="Reportability Summary"
      className="rrTable"
      fixed={true}
      fullWidth={true}
    >
      <thead>
        <tr>
          <th className="width-25p">
            <ToolTipElement toolTip="List of conditions that caused this eCR to be sent to your jurisdiction based on the rules set up for routing eCRs by your jurisdiction in RCKMS (Reportable Condition Knowledge Management System). Can include multiple Reportable Conditions for one eCR.">
              Reportable Condition
            </ToolTipElement>
          </th>
          <th>
            <ToolTipElement toolTip="Reason(s) that this eCR was sent for this condition. Corresponds to your jurisdiction's rules for routing eCRs in RCKMS (Reportable Condition Knowledge Management System).">
              RCKMS Rule Summary
            </ToolTipElement>
          </th>
          <th className="width-25p">
            <ToolTipElement toolTip="List of jurisdictions this eCR was sent to. Can include multiple jurisdictions depending on provider location, patient address, and jurisdictions onboarded to eCR.">
              Jurisdiction Sent eCR
            </ToolTipElement>
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ key, condition, trigger, location }) => (
          <tr key={key}>
            {condition ? (
              <td rowSpan={condition.rowSpan}>{condition.value}</td>
            ) : null}
            {trigger ? (
              <td rowSpan={trigger.rowSpan}>{trigger.value}</td>
            ) : null}
            <td>{location}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};

interface TableCellData {
  value: string;
  rowSpan: number;
}

interface ReportableConditionRow {
  key: string;
  condition: TableCellData | null;
  trigger: TableCellData | null;
  location: string;
}

const useConvertDictionaryToRows = (dictionary: ReportableConditions) => {
  if (!dictionary) return [];
  const rows: ReportableConditionRow[] = [];

  Object.entries(dictionary).forEach(([condition, triggers], _) => {
    Object.entries(triggers).forEach(([trigger, locations], triggerIndex) => {
      const locationsArray = Array.from(locations);
      locationsArray.forEach((location, locationIndex) => {
        const isConditionRow = triggerIndex === 0 && locationIndex === 0;
        const isTriggerRow = locationIndex === 0;

        const conditionRowSpan = Object.keys(triggers).reduce(
          (acc, key) => acc + Array.from(triggers[key]).length,
          0,
        );
        const triggerRowSpan = locationsArray.length;

        const row: ReportableConditionRow = {
          key: `${condition}-${trigger}-${location}`,
          condition: isConditionRow
            ? {
                value: condition,
                rowSpan: conditionRowSpan,
              }
            : null,
          trigger: isTriggerRow
            ? {
                value: trigger,
                rowSpan: triggerRowSpan,
              }
            : null,
          location: location ?? "",
        };

        rows.push(row);
      });
    });
  });

  return rows;
};

export default EcrMetadata;
