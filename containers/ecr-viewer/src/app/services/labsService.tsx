import "server-only";
import React from "react";

import { HeadingLevel, Tag } from "@trussworks/react-uswds";
import {
  Bundle,
  Device,
  DiagnosticReport,
  Observation,
  Organization,
  Reference,
} from "fhir/r4";
import { Coding, ObservationComponent } from "fhir/r4b";

import {
  RenderableNode,
  arrayToElement,
  noData,
  safeParse,
} from "@/app/utils/data-utils";
import {
  evaluateAll,
  evaluateReference,
  evaluateValue,
} from "@/app/utils/evaluate";
import fhirPathMappings from "@/app/utils/evaluate/fhir-paths";
import {
  extractNumbersAndPeriods,
  toKebabCase,
} from "@/app/utils/format-utils";
import {
  DataDisplay,
  DisplayDataProps,
} from "@/app/view-data/components/DataDisplay";
import EvaluateTable, {
  ColumnInfoInput,
} from "@/app/view-data/components/EvaluateTable";
import { JsonTable } from "@/app/view-data/components/JsonTable";
import { LabAccordion } from "@/app/view-data/components/LabAccordion";
import { AccordionItem } from "@/app/view-data/types";

import { getHumanReadableCodeableConcept } from "./evaluateFhirDataService";
import { formatDateTime } from "./formatDateService";
import { formatAddress, formatPhoneNumber } from "./formatService";
import {
  HtmlTableJson,
  HtmlTableJsonRow,
  formatTablesToJSON,
} from "./htmlTableService";

export interface ResultObject {
  [key: string]: AccordionItem[];
}

export interface LabReportElementData {
  organizationId: string;
  diagnosticReportDataItems: AccordionItem[];
  organizationDisplayDataProps: DisplayDataProps[];
}

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

/**
 * Extracts an array of `Observation` resources from a given FHIR bundle based on a list of observation references.
 * @param report - The lab report containing the results to be processed.
 * @param fhirBundle - The FHIR bundle containing related resources for the lab report.
 * @returns An array of `Observation` resources from the FHIR bundle that correspond to the
 * given references. If no matching observations are found or if the input references array is empty, an empty array
 * is returned.
 */
export const getObservations = (
  report: DiagnosticReport,
  fhirBundle: Bundle,
): Array<Observation> => {
  if (!report || !Array.isArray(report.result) || report.result.length === 0)
    return [];
  return report.result
    .map((obsRef) =>
      evaluateReference<Observation>(fhirBundle, obsRef.reference),
    )
    .filter((obs): obs is Observation => obs !== undefined);
};

/**
 * Retrieves the JSON representation of a lab report from the labs HTML string.
 * @param report - The LabReport object containing information about the lab report.
 * @param fhirBundle - The FHIR Bundle object containing relevant FHIR resources.
 * @returns The JSON representation of the lab report.
 */
export const getLabJsonObject = (
  report: DiagnosticReport | undefined,
  fhirBundle: Bundle,
): HtmlTableJson => {
  if (!report) return {} as HtmlTableJson;
  // Get reference value (result ID) from Observations
  const observations = getObservations(report, fhirBundle);
  const observationRefValsArray = observations.flatMap((observation) => {
    const refVal = evaluateAll(
      observation,
      fhirPathMappings.observationReferenceValue,
    );
    return extractNumbersAndPeriods(refVal);
  });
  const observationRefVal = [...new Set(observationRefValsArray)].join(", "); // should only be 1

  // Get lab reports HTML String (for all lab reports) & convert to JSON
  const labsString = evaluateValue(fhirBundle, fhirPathMappings.labResultDiv);
  const labsJson = formatTablesToJSON(labsString);

  // Get specified lab report (by reference value)
  if (observationRefVal) {
    return labsJson.filter(
      (obj) => obj.resultId?.includes(observationRefVal),
    )[0];
  }

  // If there is no reference value, return all lab results
  // In these eCRs we are seeing all results in one table
  if (labsJson.length > 0) {
    return labsJson[0];
  }

  return {} as HtmlTableJson;
};

/**
 * Checks whether the result name of a lab report includes the term "abnormal"
 * @param labReportJson - A JSON object representing the lab report HTML string
 * @returns True if the result name includes "abnormal" (case insensitive), otherwise false. Will also return false if lab does not have JSON object.
 */
export const checkAbnormalTag = (labReportJson: HtmlTableJson): boolean => {
  if (!labReportJson) {
    return false;
  }
  const labResultName = labReportJson.resultName;

  return labResultName?.toLowerCase().includes("abnormal") ?? false;
};

/**
 * Recursively searches through a nested array of objects to find values associated with a specified search key.
 * @param result - The array of objects to search through.
 * @param searchKey - The key to search for within the objects.
 * @returns - A comma-separated string containing unique search key values.
 * @example result - JSON object that contains the tables for all lab reports
 * @example searchKey - Ex. "Analysis Time" or the field that we are searching data for.
 */
export function searchResultRecord(
  result: HtmlTableJsonRow[] | HtmlTableJsonRow[][],
  searchKey: string,
): RenderableNode {
  const resultsArray: RenderableNode[] = [];

  // Loop through each table
  for (const table of result) {
    // For each table, recursively search through all nodes
    if (Array.isArray(table)) {
      const nestedResult = searchResultRecord(table, searchKey);
      if (nestedResult) {
        return nestedResult;
      }
    } else if (
      table.hasOwnProperty(searchKey) &&
      table[searchKey].hasOwnProperty("value")
    ) {
      resultsArray.push(table[searchKey].value);
    }
  }

  // Remove empties and duplicates
  const res = [...new Set(resultsArray.filter(Boolean))];
  return arrayToElement(res);
}

/**
 * Extracts and consolidates the specimen source descriptions from observations within a lab report.
 * @param report - The lab report containing the results to be processed.
 * @param fhirBundle - The FHIR bundle containing related resources for the lab report.
 * @returns A comma-separated string of unique collection times, or a 'No data' JSX element if none are found.
 */
const returnSpecimenSource = (
  report: DiagnosticReport,
  fhirBundle: Bundle,
): RenderableNode => {
  const observations = getObservations(report, fhirBundle);
  const specimenSource = observations.flatMap((observation) => {
    return evaluateAll(observation, fhirPathMappings.specimenSource);
  });
  if (!specimenSource || specimenSource.length === 0) {
    return noData;
  }
  return [...new Set(specimenSource)].join(", ");
};

/**
 * Extracts and formats the specimen collection time(s) from observations within a lab report.
 * @param report - The lab report containing the results to be processed.
 * @param fhirBundle - The FHIR bundle containing related resources for the lab report.
 * @returns A comma-separated string of unique collection times, or a 'No data' JSX element if none are found.
 */
const returnCollectionTime = (
  report: DiagnosticReport,
  fhirBundle: Bundle,
): RenderableNode => {
  const observations = getObservations(report, fhirBundle);
  const collectionTime = observations.flatMap((observation) => {
    const rawTime = evaluateAll(
      observation,
      fhirPathMappings.specimenCollectionTime,
    );
    return rawTime.map((dateTimeString) => formatDateTime(dateTimeString));
  });

  if (!collectionTime || collectionTime.length === 0) {
    return noData;
  }

  return [...new Set(collectionTime)].join(", ");
};

/**
 * Extracts and formats the specimen received time(s) from observations within a lab report.
 * @param report - The lab report containing the results to be processed.
 * @param fhirBundle - The FHIR bundle containing related resources for the lab report.
 * @returns A comma-separated string of unique collection times, or a 'No data' JSX element if none are found.
 */
const returnReceivedTime = (
  report: DiagnosticReport,
  fhirBundle: Bundle,
): RenderableNode => {
  const observations = getObservations(report, fhirBundle);
  const receivedTime = observations.flatMap((observation) => {
    const rawTime = evaluateAll(
      observation,
      fhirPathMappings.specimenReceivedTime,
    );
    return rawTime.map((dateTimeString) => formatDateTime(dateTimeString));
  });

  if (!receivedTime || receivedTime.length === 0) {
    return noData;
  }

  return [...new Set(receivedTime)].join(", ");
};

/**
 * Extracts and formats a field value from within a lab report (sourced from HTML string).
 * @param labReportJson - A JSON object representing the lab report HTML string
 * @param fieldName - A string containing the field name for which the value is being searched.
 * @returns A comma-separated string of unique collection times, or a 'No data' JSX element if none are found.
 */
export const returnFieldValueFromLabHtmlString = (
  labReportJson: HtmlTableJson,
  fieldName: string,
): RenderableNode => {
  if (!labReportJson) {
    return noData;
  }
  const labTables = labReportJson.tables;
  const fieldValue = searchResultRecord(labTables ?? [], fieldName);

  if (!fieldValue) {
    return noData;
  }

  return fieldValue;
};

/**
 * Extracts and formats the analysis date/time(s) from within a lab report (sourced from HTML string).
 * @param labReportJson - A JSON object representing the lab report HTML string
 * @param fieldName - A string containing the field name for Analysis Time
 * @returns A comma-separated string of unique collection times, or a 'No data' JSX element if none are found.
 */
export const returnAnalysisTime = (
  labReportJson: HtmlTableJson,
  fieldName: string,
): RenderableNode => {
  const fieldVal = returnFieldValueFromLabHtmlString(labReportJson, fieldName);

  if (fieldVal === noData) {
    return noData;
  }

  // recursively pull out strings in the element
  const getDateTimes = (el: RenderableNode): string[] => {
    if (typeof el === "string") return [el];
    if (!el?.props?.children) return [];

    if (Array.isArray(el.props.children)) {
      return el.props.children.flatMap((c: RenderableNode) => getDateTimes(c));
    } else {
      return getDateTimes(el.props.children);
    }
  };

  const dts = getDateTimes(fieldVal);
  return (
    [...new Set(dts.map(formatDateTime).filter(Boolean))].join(", ") || noData
  );
};

/**
 * Evaluates and generates a table of observations based on the provided DiagnosticReport,
 * FHIR bundle, mappings, and column information.
 * @param report - The DiagnosticReport containing observations to be evaluated.
 * @param fhirBundle - The FHIR bundle containing observation data.
 * @param columnInfo - An array of column information objects specifying column names and information paths.
 * @returns The JSX representation of the evaluated observation table, or undefined if there are no observations.
 */
export function evaluateObservationTable(
  report: DiagnosticReport,
  fhirBundle: Bundle,
  columnInfo: ColumnInfoInput[],
): React.JSX.Element | undefined {
  const observations = (
    report.result?.map((obsRef) =>
      evaluateReference<Observation>(fhirBundle, obsRef.reference),
    ) ?? []
  ).filter((observation): observation is Observation => {
    if (!observation) return false;
    if (observation.component) return false;
    const hasValidCoding = observation.code?.coding?.some(
      (c: Coding) => c?.display && c.display !== "Lab Interpretation",
    );
    return !!hasValidCoding;
  });

  if (observations.length > 0) {
    return (
      <EvaluateTable
        resources={observations}
        columns={columnInfo}
        className="margin-y-0"
        outerBorder={false}
      />
    );
  }
}

/**
 * Evaluates diagnostic report data and generates the lab observations for each report.
 * @param report - An object containing an array of result references.
 * @param fhirBundle - The FHIR bundle containing diagnostic report data.
 * @returns - An array of React elements representing the lab observations.
 */
export const evaluateDiagnosticReportData = (
  report: DiagnosticReport | undefined,
  fhirBundle: Bundle,
): React.JSX.Element | undefined => {
  if (!report) return undefined;

  const columnInfo: ColumnInfoInput[] = [
    {
      columnName: "Component",
      infoPath: "observationComponent",
      className: "minw-10 width-40",
    },
    {
      columnName: "Value",
      infoPath: "observationValue",
      className: "minw-10 width-40",
    },
    {
      columnName: "Ref Range",
      infoPath: "observationReferenceRange",
      className: "minw-10 width-20",
    },
    {
      columnName: "Test Method",
      infoPath: "observationDeviceReference",
      applyToValue: (ref) => {
        const device = evaluateReference<Device>(fhirBundle, ref);
        return safeParse(device?.deviceName?.[0]?.name ?? "");
      },
      className: "minw-10 width-20",
    },
    {
      columnName: "Lab Comment",
      infoPath: "observationNote",
      hiddenBaseText: "comment",
      applyToValue: (v) => safeParse(v),
      className: "minw-10 width-20",
    },
  ];
  return evaluateObservationTable(report, fhirBundle, columnInfo);
};

/**
 * Evaluates lab organisms data and generates a lab table for each report.
 * @param report - An object containing an array of lab result references. If it exists, one of the Observations in the report will contain all the lab organisms table data.
 * @param fhirBundle - The FHIR bundle containing diagnostic report data.
 * @returns - An array of React elements representing the lab organisms table.
 */
export const evaluateOrganismsReportData = (
  report: DiagnosticReport | undefined,
  fhirBundle: Bundle,
): React.JSX.Element | undefined => {
  if (!report) return undefined;

  let components: ObservationComponent[] = [];
  let observation: Observation | undefined;

  report.result?.find((obsRef: Reference) => {
    const obs = evaluateReference<Observation>(
      fhirBundle,
      obsRef.reference ?? "",
    );
    if (obs?.component) {
      observation = obs;
      return true;
    }
    return false;
  });

  if (observation === undefined) {
    return undefined;
  }
  components = observation.component!;
  const columnInfo: ColumnInfoInput[] = [
    {
      columnName: "Organism",
      value: evaluateValue(observation, fhirPathMappings.observationOrganism),
    },
    { columnName: "Antibiotic", infoPath: "observationAntibiotic" },
    { columnName: "Method", infoPath: "observationOrganismMethod" },
    { columnName: "Susceptibility", infoPath: "observationSusceptibility" },
  ];

  return (
    <EvaluateTable
      resources={components}
      columns={columnInfo}
      className="margin-y-0"
      outerBorder={false}
    />
  );
};

/**
 * Evaluates lab information and RR data from the provided FHIR bundle and mappings.
 * @param fhirBundle - The FHIR bundle containing lab and RR data.
 * @param labReports - An array of DiagnosticReport objects
 * @param accordionHeadingLevel - Heading level for the title of AccordionLabResults.
 * @returns An array of the Diagnostic reports Elements and Organization Display Data
 */
export const evaluateLabInfoData = (
  fhirBundle: Bundle,
  labReports: DiagnosticReport[],
  accordionHeadingLevel: HeadingLevel = "h5",
): LabReportElementData[] | DisplayDataProps[] => {
  // the keys are the organization id, the value is an array of jsx elements of diagnsotic reports
  let organizationItems: ResultObject = {};

  for (const report of labReports) {
    const labReportJson = getLabJsonObject(report, fhirBundle);

    // If there is no result ID we just display the HTML as is
    if (labReportJson.resultId === undefined) {
      return getUnformattedLabsContent(fhirBundle, accordionHeadingLevel);
    }

    const content: Array<React.JSX.Element> = getFormattedLabsContent(
      report,
      fhirBundle,
      labReportJson,
    );
    const organizationId = (report.performer?.[0].reference ?? "").replace(
      "Organization/",
      "",
    );
    const title = getHumanReadableCodeableConcept(report.code) ?? "Unknown";
    const item = {
      title: (
        <>
          {title}
          {checkAbnormalTag(labReportJson) && (
            <Tag background="#B50909" className="margin-left-105">
              Abnormal
            </Tag>
          )}
        </>
      ),
      content,
      expanded: false,
      id: toKebabCase(title),
      headingLevel: accordionHeadingLevel,
    };

    organizationItems = groupItemByOrgId(
      organizationItems,
      organizationId,
      item,
    );
  }

  return combineOrgAndReportData(organizationItems, fhirBundle);
};

/**
 * Combines the org display data with the diagnostic report elements
 * @param organizationItems - Object contianing the keys of org data, values of the diagnostic report elements
 * @param fhirBundle - The FHIR bundle containing lab and RR data.
 * @returns An array of the Diagnostic reports Elements and Organization Display Data
 */
export const combineOrgAndReportData = (
  organizationItems: ResultObject,
  fhirBundle: Bundle,
): LabReportElementData[] => {
  return Object.keys(organizationItems).map((key: string) => {
    const organizationId = key.replace("Organization/", "");
    const orgData = evaluateLabOrganizationData(
      organizationId,
      fhirBundle,
      organizationItems[key].length,
    );
    return {
      organizationId,
      diagnosticReportDataItems: organizationItems[key],
      organizationDisplayDataProps: orgData,
    };
  });
};

/**
 * Finds the Orgnization that matches the id and creates a DisplayDataProps array
 * @param id - id of the organization
 * @param fhirBundle - The FHIR bundle containing lab and RR data.
 * @param labReportCount - A number representing the amount of lab reports for a specific organization
 * @returns The organization display data as an array
 */
export const evaluateLabOrganizationData = (
  id: string,
  fhirBundle: Bundle,
  labReportCount: number,
) => {
  const orgMappings = evaluateAll(fhirBundle, fhirPathMappings.organizations);
  let matchingOrg: Organization = orgMappings.filter(
    (organization) => organization.id === id,
  )[0];
  if (matchingOrg) {
    matchingOrg = findIdenticalOrg(orgMappings, matchingOrg);
  }
  const orgAddress = matchingOrg?.address?.[0];
  const formattedAddress = formatAddress(orgAddress);

  const contactInfo = formatPhoneNumber(matchingOrg?.telecom?.[0].value);
  const name = matchingOrg?.name ?? "";
  const matchingOrgData: DisplayDataProps[] = [
    { title: "Lab Performing Name", value: name },
    { title: "Lab Address", value: formattedAddress },
    { title: "Lab Contact", value: contactInfo },
    { title: "Number of Results", value: labReportCount },
  ];
  return matchingOrgData;
};

/**
 * Finds an identical organization based on address and assigns the telecom to the matched organization
 * Checks if id is not the same to avoid comparing to itself as well as address line 0, address line 1,
 * city, state, and postal code are the same, if so it assigns the telecom to the matchedOrg
 * @param orgMappings a list of all the organizations found in the fhir bundle
 * @param matchedOrg the org that matches the id of the lab
 * @returns the matchedOrg with the telecom assigned if applicable
 */
export const findIdenticalOrg = (
  orgMappings: Organization[],
  matchedOrg: Organization,
): Organization => {
  orgMappings.forEach((organization) => {
    if (
      organization?.id !== matchedOrg?.id &&
      organization?.address?.[0]?.line?.[0] ===
        matchedOrg?.address?.[0]?.line?.[0] &&
      organization?.address?.[0]?.line?.[1] ===
        matchedOrg?.address?.[0]?.line?.[1] &&
      organization?.address?.[0]?.city === matchedOrg?.address?.[0]?.city &&
      organization?.address?.[0]?.state === matchedOrg?.address?.[0]?.state &&
      organization?.address?.[0]?.postalCode ===
        matchedOrg?.address?.[0]?.postalCode
    ) {
      Object.assign(matchedOrg, {
        telecom: organization.telecom,
      });
    }
  });
  return matchedOrg;
};

/**
 * Groups a JSX element under a specific organization ID within a result object. If the organization ID
 * already exists in the result object, the element is added to the existing array. If the organization ID
 * does not exist, a new array is created for that ID and the element is added to it.
 * @param resultObject - An object that accumulates grouped elements, where each key is an
 *   organization ID and its value is an array of JSX elements associated
 *   with that organization.
 * @param organizationId - The organization ID used to group the element. This ID determines the key
 *   under which the element is stored in the result object.
 * @param item - The JSX element to be grouped under the specified organization ID.
 * @returns The updated result object with the element added to the appropriate group.
 */
const groupItemByOrgId = (
  resultObject: ResultObject,
  organizationId: string,
  item: AccordionItem,
) => {
  if (resultObject.hasOwnProperty(organizationId)) {
    resultObject[organizationId].push(item);
  } else {
    resultObject[organizationId] = [item];
  }
  return resultObject;
};

/**
 * Retrieves the content for a lab report.
 * @param report - The DiagnosticReport resource.
 * @param fhirBundle - The FHIR Bundle.
 * @param labReportJson - The JSON representation of the lab results HTML.
 * @returns An array of JSX elements representing the lab report content.
 */
function getFormattedLabsContent(
  report: DiagnosticReport,
  fhirBundle: Bundle,
  labReportJson: HtmlTableJson,
) {
  const labTableDiagnostic = evaluateDiagnosticReportData(report, fhirBundle);
  const labTableOrganisms = evaluateOrganismsReportData(report, fhirBundle);
  const rrInfo: DisplayDataProps[] = [
    {
      title: "Analysis Time",
      value: returnAnalysisTime(labReportJson, "Analysis Time"),
      className: "lab-text-content",
    },
    {
      title: "Collection Time",
      value: returnCollectionTime(report, fhirBundle),
      className: "lab-text-content",
    },
    {
      title: "Received Time",
      value: returnReceivedTime(report, fhirBundle),
      className: "lab-text-content",
    },
    {
      title: "Specimen (Source)",
      value: returnSpecimenSource(report, fhirBundle),
      className: "lab-text-content",
    },
    {
      title: "Anatomical Location/Laterality",
      value: returnFieldValueFromLabHtmlString(
        labReportJson,
        "Anatomical Location / Laterality",
      ),
      className: "lab-text-content",
    },
    {
      title: "Collection Method/Volume",
      value: returnFieldValueFromLabHtmlString(
        labReportJson,
        "Collection Method / Volume",
      ),
      className: "lab-text-content",
    },
    {
      title: "Resulting Agency Comment",
      value: returnFieldValueFromLabHtmlString(
        labReportJson,
        "Resulting Agency Comment",
      ),
      className: "lab-text-content",
    },
    {
      title: "Authorizing Provider",
      value: returnFieldValueFromLabHtmlString(
        labReportJson,
        "Authorizing Provider",
      ),
      className: "lab-text-content",
    },
    {
      title: "Result Type",
      value: returnFieldValueFromLabHtmlString(labReportJson, "Result Type"),
      className: "lab-text-content",
    },
    {
      title: "Narrative",
      value: returnFieldValueFromLabHtmlString(labReportJson, "Narrative"),
      className: "lab-text-content",
    },
  ];
  const content: Array<React.JSX.Element> = [];
  if (labTableDiagnostic)
    content.push(
      <React.Fragment key="lab-table-diagnostic">
        {labTableDiagnostic}
      </React.Fragment>,
    );
  if (labTableOrganisms) {
    content.push(
      <React.Fragment key="lab-table-oragnisms">
        {labTableOrganisms}
      </React.Fragment>,
    );
  }
  content.push(
    ...rrInfo.map((item) => {
      return <DataDisplay key={`${item.title}-${item.value}`} item={item} />;
    }),
  );
  return content;
}

/**
 * Retrieves lab results from HTML table in the fhir bundle and returns them as an array of DisplayDataProps.
 * @param fhirBundle - The FHIR bundle containing lab data.
 * @param accordionHeadingLevel - Heading level for the Accordion menu title.
 * @returns An array of DisplayDataProps containing the lab results.
 * Note: Even though we only need one DisplayDataProps object for the lab results, returning as an array makes the result of evaluateLabInfoData easier to work with.
 */
function getUnformattedLabsContent(
  fhirBundle: Bundle,
  accordionHeadingLevel: HeadingLevel = "h5",
): DisplayDataProps[] {
  const bundle = evaluateValue(fhirBundle, fhirPathMappings.labResultDiv);
  const tableJson = formatTablesToJSON(bundle);

  if (tableJson.length === 0) {
    return [];
  }

  return [
    {
      title: "Lab Results",
      value: (
        <LabAccordion
          items={[
            {
              title: "All Lab Results",
              content: tableJson.map((table, index) => (
                <JsonTable
                  key={`lab-result-table_${index}`}
                  jsonTableData={table}
                  outerBorder={false}
                  className="lab-results-table-from-div"
                />
              )),
              headingLevel: accordionHeadingLevel,
              className: "padding-bottom-0",
              id: "all-lab-results",
              expanded: false,
            },
          ]}
        />
      ),
      dividerLine: false,
    } as DisplayDataProps,
  ];
}
