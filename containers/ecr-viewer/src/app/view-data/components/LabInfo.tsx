import React from "react";

import { ExpandCollapseAccordion } from "@/app/components/ExpandCollapseAccordion";
import { LabReportElementData } from "@/app/view-data/services/labsService";
import {
  AccordionSection,
  AccordionSubSection,
} from "@/app/view-data/utils/component-utils";

import { DataDisplay } from "./DataDisplay";
import { toKebabCase } from "@/app/utils/format-utils";

interface LabInfoProps {
  labResults: LabReportElementData[];
  sectionIds: string[];
}

/**
 * Functional component for displaying lab information.
 * @param props - Props containing lab information.
 * @param props.labResults - some props
 * @returns The JSX element representing the lab information.
 */
export const LabInfo = ({ labResults, sectionIds = [] }: LabInfoProps) => {
  return (
    <AccordionSection>
      {labResults.map((res, i) => (
        <LabResultDetail
          key={i}
          labResult={res}
          sectionId={sectionIds[i]}
        />
      ))}
    </AccordionSection>
  );
};

const LabResultDetail = ({
  labResult,
  sectionId,
}: {
  labResult: LabReportElementData;
  sectionId: string;
}) => {
  const labName = `Lab Results from ${
    labResult?.organizationDisplayDataProps?.[0]?.value ||
    "Unknown Organization"
  }`;

  return (
    <AccordionSubSection title={labName} id={sectionId}>
      {labResult?.organizationDisplayDataProps?.map((item, index) => {
        if (item.value) return <DataDisplay item={item} key={index} />;
      })}
      <ExpandCollapseAccordion
        className="accordion-rr margin-bottom-3"
        items={labResult.diagnosticReportDataItems}
        descriptor="labs"
      />
    </AccordionSubSection>
  );
};

export type LabNavItem = {
  title: string;
  id: string;
};

/**
 * Creates a unique lab section ID for the SideNav.
 *
 * The generated ID is based on the lab organization's name and converted to kebab-case.
 * If an ID with the same org name has already been used, a numeric suffix is added
 * to ensure uniqueness.
 *
 * @param organizationName - The name of the lab organization.
 * If undefined, defaults to "Unknown Organization".
 * @param usedIds - A set of IDs that already generated. The newly created ID
 * is added to this set before being returned.
 * @returns A unique lab section ID string.
 */
export const createLabSectionId = (
  organizationName: string | undefined,
  usedIds: Set<string>,
) => {
  const baseName = (organizationName || "Unknown Organization").trim();
  const baseId = `lab-results-from-${toKebabCase(baseName)}`;
  let candidateId = baseId;
  let suffix = 2;

  while (usedIds.has(candidateId)) {
    candidateId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  usedIds.add(candidateId);
  return candidateId;
};

export default LabInfo;
