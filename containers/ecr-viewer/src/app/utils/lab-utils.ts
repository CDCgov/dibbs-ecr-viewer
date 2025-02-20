import { LabReportElementData } from "../services/labsService";
import { DisplayDataProps } from "../view-data/components/DataDisplay";

/**
 * Checks if a given list is of type LabReportElementData[].
 * Used to determine how to render lab results.
 * @param labResults - Object to be checked.
 * @returns True if the list is of type LabReportElementData[], false otherwise.
 */
export const isLabReportElementDataList = (
  labResults: DisplayDataProps[] | LabReportElementData[],
): labResults is LabReportElementData[] => {
  const asLabReportElementList = labResults as LabReportElementData[];
  return (
    asLabReportElementList &&
    asLabReportElementList.length > 0 &&
    asLabReportElementList[0].diagnosticReportDataItems !== undefined &&
    asLabReportElementList[0].organizationId !== undefined &&
    asLabReportElementList[0].organizationDisplayDataProps !== undefined
  );
};
