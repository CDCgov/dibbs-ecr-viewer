"use client";
import React, { useState } from "react";

import { Button } from "@trussworks/react-uswds";
import { motion } from "motion/react";
import Link from "next/link";

import { useQueryParam } from "@/app/hooks/useQueryParam";
import { formatDate, formatDateTime } from "@/app/services/formatDateService";
import { EcrDisplay, RelatedEcr } from "@/app/services/listEcrDataService";
import { noData } from "@/app/utils/data-utils";
import { makePlural, toSentenceCase } from "@/app/utils/format-utils";
import { saveToSessionStorage } from "@/app/utils/storage-utils";

import { ExpandMore } from "./Icon";

const transition = {
  type: "spring",
  stiffness: 203,
  damping: 25,
};

/**
 * Formats a single row of the eCR table.
 * @param props - The properties passed to the component.
 * @param props.item - The eCR data to be formatted.
 * @param props.numEcrs - The total number of eCRs being displayed right now
 * @param props.index - The index of this eCR in that set
 * @returns A JSX table row element representing the eCR data.
 */
export const EcrTableDataRow = ({
  item,
  numEcrs,
  index,
}: {
  item: EcrDisplay;
  numEcrs: number;
  index: number;
}) => {
  const [isExpanded, setExpanded] = useState(false);
  const patientName =
    toSentenceCase(item.patient_first_name) +
    " " +
    toSentenceCase(item.patient_last_name);

  const conditionsList = (
    <ul className="ecr-table-list">
      {item.reportable_conditions.map((rc, index) => (
        <li key={index}>{rc}</li>
      ))}
    </ul>
  );

  const summariesList = (
    <ul className="ecr-table-list">
      {item.rule_summaries.map((rs, index) => (
        <li key={index}>{rs}</li>
      ))}
    </ul>
  );

  return (
    <>
      <motion.tr
        className="main-row"
        role="row"
        aria-level={1}
        aria-setsize={numEcrs}
        aria-posinset={index + 1}
        aria-expanded={item.related_ecrs.length > 0 ? isExpanded : undefined}
        layout="position"
        transition={transition}
        key={`row-${item.ecrId}`}
      >
        <td role="gridcell">
          <div className="patient-name-cell">
            {item.related_ecrs.length > 0 && (
              <Button
                aria-label={`${isExpanded ? "Hide" : "View"} Related eCRs`}
                className="usa-button expand-ecrs-button text-base"
                type="button"
                onClick={() => setExpanded(!isExpanded)}
                unstyled={true}
              >
                <ExpandMore
                  aria-hidden={true}
                  className="square-3 expand-icon"
                  viewBox="2 2 20 20"
                  style={{
                    transform: `rotate(${isExpanded ? "0" : "-90deg"})`,
                  }}
                />
              </Button>
            )}
            <div className="patient-name-content">
              <UrlSavingLink ecrId={item.ecrId}>{patientName}</UrlSavingLink>
              {item.eicr_version_number && (
                <span className="usa-tag margin-x-1 padding-x-05 padding-y-2px bg-primary-lighter radius-md text-thin text-base-dark">
                  V{item.eicr_version_number}
                </span>
              )}
              <br />
              DOB: {item.patient_date_of_birth}
            </div>
          </div>
        </td>
        <td role="gridcell">{item.date_created}</td>
        <td role="gridcell">{item.patient_report_date || noData}</td>
        <td role="gridcell">{conditionsList}</td>
        <td role="gridcell">{summariesList}</td>
      </motion.tr>

      {isExpanded && <RelatedRows item={item} patientName={patientName} />}
    </>
  );
};

/**
 * A set of child row of a main row. It contains more limited data on other eCRs from the same
 * set as the main one. Up to five related eCRs are shown to start, then the rest can be
 * expanded
 * @param props - React props
 * @param props.item - an EcrDisplay item
 * @param props.patientName - the formatted patient name
 * @returns array of related ecr rows
 */
const RelatedRows = ({
  item,
  patientName,
}: {
  item: EcrDisplay;
  patientName: string;
}) => {
  const numRows = item.related_ecrs.length;
  const [isExpanded, setIsExpanded] = useState(numRows <= 5);

  const firstEcrs = item.related_ecrs.slice(0, 5);
  const remainingEcrs = item.related_ecrs.slice(5);

  return (
    <>
      {firstEcrs.map((ecr, i) => (
        <RelatedRow
          key={ecr.eicr_id}
          ecr={ecr}
          patientName={patientName}
          mainDateCreated={item.date_created}
          numRows={numRows}
          index={i}
        />
      ))}
      {!isExpanded ? (
        <SlidingRow id={`show-more-${item.ecrId}`}>
          <td role="gridcell" colSpan={999}>
            <Button
              type="button"
              unstyled={true}
              onClick={() => setIsExpanded(!isExpanded)}
            >
              Show {remainingEcrs.length} more eCR
              {makePlural(remainingEcrs.length)}
            </Button>
          </td>
        </SlidingRow>
      ) : (
        remainingEcrs.map((ecr, i) => (
          <RelatedRow
            key={ecr.eicr_id}
            ecr={ecr}
            patientName={patientName}
            mainDateCreated={item.date_created}
            numRows={numRows}
            index={i + 5}
          />
        ))
      )}
    </>
  );
};

/**
 * One child row of a main row. It contains more limited data on other eCRs from the same
 * set as the main one.
 * @param props - React props
 * @param props.patientName - the formatted patient name
 * @param props.ecr - The RelatedEcr to display
 * @param props.mainDateCreated - The date the main eCR was created. Used to determine formatting of the related date
 * @param props.numRows - The total number of rows in the set of related rows (for a11y)
 * @param props.index - The index of this row in the set of related rows (for a11y)
 * @returns one related ecr row
 */
const RelatedRow = ({
  patientName,
  ecr,
  mainDateCreated,
  numRows,
  index,
}: {
  patientName: string;
  ecr: RelatedEcr;
  mainDateCreated: string;
  numRows: number;
  index: number;
}) => {
  const mainDate = formatDate(mainDateCreated);
  const ecrDateTime = formatDateTime(ecr.date_created.toISOString());
  const [ecrDate, ecrTime] = ecrDateTime.split(" ");

  return (
    <SlidingRow
      id={ecr.eicr_id}
      aria-setsize={numRows}
      aria-posinset={index + 1}
    >
      <td role="gridcell">
        <UrlSavingLink ecrId={ecr.eicr_id}>{patientName}</UrlSavingLink>
        {ecr.eicr_version_number && (
          <span className="usa-tag margin-x-1 padding-x-05 padding-y-2px bg-primary-lighter radius-md text-thin text-base-dark">
            V{ecr.eicr_version_number}
          </span>
        )}
      </td>
      <td role="gridcell" colSpan={999}>
        {ecrDate === mainDate ? <strong>{ecrTime}</strong> : ecrTime} {ecrDate}
      </td>
    </SlidingRow>
  );
};

// A row that animates in by sliding/fading
const SlidingRow = ({
  children,
  id,
  ...props
}: {
  children: React.ReactNode;
  id: string;
  props?: JSX.IntrinsicElements["tr"];
}) => {
  return (
    <motion.tr
      className="related-row"
      role="row"
      aria-level={2}
      layout={true}
      id={`related-row-${id}`}
      key={`row-${id}`}
      initial={{ translateY: "-50%", opacity: 0 }}
      animate={{ translateY: 0, opacity: 1 }}
      transition={{ ...transition, delay: 0.1 }}
      {...props}
    >
      {children}
    </motion.tr>
  );
};

// When the link is clicked, the current url is saved (to enable better "back to
// library" experience)
const UrlSavingLink = ({
  ecrId,
  children,
}: {
  ecrId: string;
  children: React.ReactNode;
}) => {
  const { searchParams } = useQueryParam();

  const saveUrl = () => {
    saveToSessionStorage("urlParams", searchParams.toString());
  };

  return (
    <Link onClick={saveUrl} href={`/view-data?id=${ecrId}`}>
      {children}
    </Link>
  );
};
