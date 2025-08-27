"use client"

import React from "react";

import { Button, Table } from "@trussworks/react-uswds";

import { noData } from "@/app/utils/data-utils";
import { ERSDInfo } from "@/app/view-data/services/ecrMetadataService";
import {
  Participant,
  ReportableConditions} from "@/app/view-data/services/reportabilityService"
import {
  AccordionSection,
  AccordionSubSection,
} from "@/app/view-data/utils/component-utils";

import { DataDisplay, DisplayDataProps } from "./DataDisplay";
import { ToolTipElement } from "./ToolTipElement";

interface EcrMetadataProps {
  rrConditions: ReportableConditions;
  eicrDetails: DisplayDataProps[];
  eRSDProcessingInfo: ERSDInfo | undefined;
  eCRCustodianDetails: DisplayDataProps[];
  eicrAuthorDetails: DisplayDataProps[][];
}

const eRSDWarningTooltip = (
  <ToolTipElement toolTip="Can be used to help you identify healthcare providers that need to update their eRSD (Electronic Reporting and Surveillance Distribution) version.">
    eICR Processing Info
  </ToolTipElement>
);

/**
 * Functional component for displaying eCR metadata.
 * @param props - Props containing eCR metadata.
 * @param props.rrConditions - The reportable conditions details.
 * @param props.eicrDetails - The eICR details.
 * @param props.eRSDProcessingInfo - The eICR processing success status & eRSD warning.
 * @param props.eCRCustodianDetails - The eCR custodian details.
 * @param props.eicrAuthorDetails - The eICR author details.
 * @returns The JSX element representing the eCR metadata.
 */
const EcrMetadata = ({
  rrConditions,
  eicrDetails,
  eRSDProcessingInfo,
  eCRCustodianDetails,
  eicrAuthorDetails,
}: EcrMetadataProps) => {
  return (
    <AccordionSection>
      <AccordionSubSection title="RR Details">
        <ReportabilitySummary rrConditions={rrConditions} />
        <div className="section__line_gray" />
        {eRSDProcessingInfo?.success ? (
          <div>
            <div className="header-data-title">{eRSDWarningTooltip}</div>
            <p className="text-italic text-base padding-bottom-0">
              eICR processed
            </p>
            <div className="section__line_gray"></div>
          </div>
        ) : (
          eRSDProcessingInfo?.eRSDWarning && (
            <div>
              <Table
                bordered={false}
                className="fixed-table border-top border-left border-right border-bottom"
                fixed={true}
                fullWidth={true}
              >
                <caption>{eRSDWarningTooltip}</caption>
                <thead>
                  <tr>
                    <th>Warning</th>
                    <th>Version in Use</th>
                    <th>Expected Version</th>
                    <th>Suggested Solution</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="padding-105">
                      {eRSDProcessingInfo.eRSDWarning.warning}
                    </td>
                    <td className="padding-105">
                      {eRSDProcessingInfo.eRSDWarning.versionUsed}
                    </td>
                    <td className="padding-105">
                      {eRSDProcessingInfo.eRSDWarning.versionExpected}
                    </td>
                    <td className="padding-105">
                      {eRSDProcessingInfo.eRSDWarning.suggestedSolution}
                    </td>
                  </tr>
                </tbody>
              </Table>
              <div className="section__line_gray"></div>
            </div>
          )
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

type ReportabilitySummaryProps = Pick<EcrMetadataProps, "rrConditions">;

const ReportabilitySummary: React.FC<ReportabilitySummaryProps> = ({
  rrConditions,
}) => {
  const rows = useConvertDictionaryToRows(rrConditions);

  if (rows.length === 0) {
    return (
      <div>
        <h5 className="header-data-title">Reportability Summary</h5>
        <p className="text-italic text-base padding-bottom-0">
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
          <th className="">
            <ToolTipElement toolTip="List of conditions that caused this eCR to be sent to your jurisdiction based on the rules set up for routing eCRs by your jurisdiction in RCKMS (Reportable Condition Knowledge Management System). Can include multiple Reportable Conditions for one eCR.">
              Reportable Condition
            </ToolTipElement>
          </th>
          <th className="width-25p">
            <ToolTipElement toolTip="List of jurisdictions this eCR was sent to. Can include multiple jurisdictions depending on provider location, patient address, and jurisdictions onboarded to eCR.">
              Jurisdiction Sent eCR
            </ToolTipElement>
          </th>
          <th>
            <ToolTipElement toolTip="Reason(s) that this eCR was sent for this condition. Corresponds to your jurisdiction's rules for routing eCRs in RCKMS (Reportable Condition Knowledge Management System).">
              RCKMS Rule Summary
            </ToolTipElement>
          </th>
          <th className="width-10p">Details</th>
        </tr>
      </thead>
      <tbody className="text-pre-line">
        {rows.map(
          ({
            key,
            condition,
            participant,
            rrRule,
            hiddenRow,
            expandedHidden,
            toggle,
          }) => (
            <React.Fragment key={key}>
              <tr>
                {condition ? (
                  <td rowSpan={condition.rowSpan}>{condition.value}</td>
                ) : null}
                <td>{participant}</td>
                <td>{rrRule}</td>
                <td>
                  {hiddenRow ? (
                    <Button
                      unstyled={true}
                      type="button"
                      onClick={toggle}
                      aria-controls={`hidden-comment-${key}`}
                      aria-expanded={expandedHidden}
                      data-test-id="comment-button"
                    >
                      {!expandedHidden ? "View" : "Hide"}
                    </Button>
                  ) : (
                    noData
                  )}
                </td>
              </tr>
              {hiddenRow && expandedHidden && (
                <tr id={`hidden-comment-${key}`} className="hidden-row">
                  <td colSpan={4}>{hiddenRow}</td>
                </tr>
              )}
            </React.Fragment>
          )
        )}
      </tbody>
    </Table>
  );
};

interface TableCellData {
  value: string;
  rowSpan: number;
}

// TODO ANGELA: Rename inputs
interface ReportableConditionRow {
  key: string;
  condition: TableCellData | null;
  rrRule: string | null;
  rrReason: string | null;
  participant: React.JSX.Element[] | null;
  hiddenRow?: React.ReactNode;
  expandedHidden: boolean;
  toggle: () => void;
}

// TODO ANGELA: Rename
const useConvertDictionaryToRows = (dictionary: ReportableConditions): ReportableConditionRow[] => {
  const [expandedRows, setExpandedRows] = React.useState<
    Record<string, boolean>
  >({});

  if (!dictionary) {
    return [];
  }

  const toggleRow = (key: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const rows: ReportableConditionRow[] = [];

  Object.entries(dictionary).forEach(([condition, rrInfoArray], _) => {
    const conditionRowSpan = rrInfoArray.length;

    rrInfoArray.forEach((rrInfo, rrInfoIndex) => {
      const isConditionRow = rrInfoIndex === 0;
      const routingEntity: React.JSX.Element[] = [];
      const participants: React.JSX.Element[] = [];
      
      rrInfo.participants.forEach((p: Participant, index) => {
        if (p.role === "Routing Entity") {
          routingEntity.push(
            <div key={index}>
              {p.name}
              <br />
            </div>
          );
        } else {
          participants.push(
            <div key={index}>
              <b>{p.role}:</b>
              <br />
              {p.name}
              <br />
            </div>
          );
        }
      });

      const rules = Array.from(rrInfo.rules).join('\n');
      const reasons = Array.from(rrInfo.reasons).join('\n');
      
      // Extra participants, Determination of Reportability Reason
      let hiddenRow: React.ReactNode = undefined;

      if (false || reasons) {
        hiddenRow = (
          <>
            {participants && (
              <div>
                <strong>Details</strong>
                {participants}
              </div>
            )}
            {reasons && (
              <div>
                <strong>Determination of Reportability Reason</strong>
                <br />
                {reasons}
              </div>
            )}
          </>
        );
      }

      const key = `${condition}-${rrInfoIndex}`
      const row: ReportableConditionRow = {
        key,
        condition: isConditionRow
          ? {
              value: condition,
              rowSpan: conditionRowSpan,
            }
          : null,
        participant: routingEntity,
        rrRule: rules,
        rrReason: reasons,
        hiddenRow,
        expandedHidden: !!expandedRows[key],
        toggle: () => toggleRow(key),
      };

      rows.push(row);
    });
  });

  return rows;
};

export default EcrMetadata;
