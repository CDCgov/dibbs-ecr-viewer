import React from "react";
import { AccordionSection, AccordionSubSection } from "../../component-utils";
import {
  DataTableDisplay,
  DisplayDataProps,
} from "@/app/view-data/components/DataDisplay";
import {
  LabReportElementData,
  isLabReportElementDataList,
} from "@/app/services/labsService";
import LabResultDetail from "./LabResultDetail";

interface LabInfoProps {
  labResults: DisplayDataProps[] | LabReportElementData[];
}

/**
 * Functional component for displaying clinical information.
 * @param props - Props containing clinical information.
 * @param props.labResults - some props
 * @returns The JSX element representing the clinical information.
 */
export const LabInfo = ({ labResults }: LabInfoProps) => {
  return (
    <AccordionSection>
      {labResults &&
        (isLabReportElementDataList(labResults) ? (
          (labResults as LabReportElementData[]).map((res, i) => (
            <LabResultDetail key={i} labResult={res} />
          ))
        ) : (
          <HtmlLabResult labResult={labResults[0] as DisplayDataProps} />
        ))}
    </AccordionSection>
  );
};

const HtmlLabResult = ({ labResult }: { labResult: DisplayDataProps }) => {
  return (
    <AccordionSubSection title="Lab Results">
      <div data-testid="lab-results">
        <DataTableDisplay item={labResult} />
      </div>
    </AccordionSubSection>
  );
};

export default LabInfo;
