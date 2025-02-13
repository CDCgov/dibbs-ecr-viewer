import React from "react";
import { Bundle, Device, Observation, Organization, Reference } from "fhir/r4";
import {
  PathMappings,
  RenderableNode,
  arrayToElement,
  noData,
  safeParse,
} from "@/app/utils/data-utils";
import { evaluate } from "@/app/utils/evaluate";
import { AccordionLabResults } from "@/app/view-data/components/AccordionLabResults";
import { formatAddress, formatPhoneNumber } from "@/app/services/formatService";
import { Coding, ObservationComponent } from "fhir/r4b";
import EvaluateTable, {
  ColumnInfoInput,
} from "@/app/view-data/components/EvaluateTable";
import { evaluateReference, evaluateValue } from "./evaluateFhirDataService";
import {
  DataDisplay,
  DisplayDataProps,
} from "@/app/view-data/components/DataDisplay";
import { HeadingLevel } from "@trussworks/react-uswds";
import { returnHtmlTableContent } from "@/app/view-data/components/common";
import { extractNumbersAndPeriods } from "@/app/utils/format-utils";
import { TableJson, formatTablesToJSON } from "./htmlTableService";
import { formatDateTime } from "./formatDateService";

export interface LabReport {
  result: Array<Reference>;
}

export interface ResultObject {
  [key: string]: React.JSX.Element[];
}

export interface LabReportElementData {
  organizationId: string;
  diagnosticReportDataElements: React.JSX.Element[];
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
    asLabReportElementList[0].diagnosticReportDataElements !== undefined &&
    asLabReportElementList[0].organizationId !== undefined &&
    asLabReportElementList[0].organizationDisplayDataProps !== undefined
  );
};

/**
 * Extracts an array of `Observation` resources from a given FHIR bundle based on a list of observation references.
 * @param report - The lab report containing the results to be processed.
 * @param fhirBundle - The FHIR bundle containing related resources for the lab report.
 * @param mappings - An object containing paths to relevant fields within the FHIR resources.
 * @returns An array of `Observation` resources from the FHIR bundle that correspond to the
 * given references. If no matching observations are found or if the input references array is empty, an empty array
 * is returned.
 */
export const getObservations = (
  report: LabReport,
  fhirBundle: Bundle,
  mappings: PathMappings,
): Array<Observation> => {
  if (!report || !Array.isArray(report.result) || report.result.length === 0)
    return [];
  return report.result
    .map((obsRef) => {
      return (
        obsRef.reference &&
        evaluateReference(fhirBundle, mappings, obsRef.reference)
      );
    })
    .filter((obs) => obs);
};

/**
 * Retrieves the JSON representation of a lab report from the labs HTML string.
 * @param report - The LabReport object containing information about the lab report.
 * @param fhirBundle - The FHIR Bundle object containing relevant FHIR resources.
 * @param mappings - The PathMappings object containing mappings for extracting data.
 * @returns The JSON representation of the lab report.
 */
export const getLabJsonObject = (
  report: LabReport,
  fhirBundle: Bundle,
  mappings: PathMappings,
): TableJson => {
  // Get reference value (result ID) from Observations
  const observations = getObservations(report, fhirBundle, mappings);
  const observationRefValsArray = observations.flatMap((observation) => {
    const refVal = evaluate(observation, mappings["observationReferenceValue"]);
    return extractNumbersAndPeriods(refVal);
  });
  const observationRefVal = [...new Set(observationRefValsArray)].join(", "); // should only be 1

  // Get lab reports HTML String (for all lab reports) & convert to JSON
  const labsString = evaluateValue(fhirBundle, mappings["labResultDiv"]);
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

  return {} as TableJson;
};

/**
 * Checks whether the result name of a lab report includes the term "abnormal"
 * @param labReportJson - A JSON object representing the lab report HTML string
 * @returns True if the result name includes "abnormal" (case insensitive), otherwise false. Will also return false if lab does not have JSON object.
 */
export const checkAbnormalTag = (labReportJson: TableJson): boolean => {
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
  result: any[],
  searchKey: string,
): RenderableNode {
  let resultsArray: RenderableNode[] = [];

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
      resultsArray.push(table[searchKey]["value"]);
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
 * @param mappings - An object containing paths to relevant fields within the FHIR resources.
 * @returns A comma-separated string of unique collection times, or a 'No data' JSX element if none are found.
 */
const returnSpecimenSource = (
  report: LabReport,
  fhirBundle: Bundle,
  mappings: PathMappings,
): RenderableNode => {
  const observations = getObservations(report, fhirBundle, mappings);
  const specimenSource = observations.flatMap((observation) => {
    return evaluate(observation, mappings["specimenSource"]);
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
 * @param mappings - An object containing paths to relevant fields within the FHIR resources.
 * @returns A comma-separated string of unique collection times, or a 'No data' JSX element if none are found.
 */
const returnCollectionTime = (
  report: LabReport,
  fhirBundle: Bundle,
  mappings: PathMappings,
): RenderableNode => {
  const observations = getObservations(report, fhirBundle, mappings);
  const collectionTime = observations.flatMap((observation) => {
    const rawTime = evaluate(observation, mappings["specimenCollectionTime"]);
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
 * @param mappings - An object containing paths to relevant fields within the FHIR resources.
 * @returns A comma-separated string of unique collection times, or a 'No data' JSX element if none are found.
 */
const returnReceivedTime = (
  report: LabReport,
  fhirBundle: Bundle,
  mappings: PathMappings,
): RenderableNode => {
  const observations = getObservations(report, fhirBundle, mappings);
  const receivedTime = observations.flatMap((observation) => {
    const rawTime = evaluate(observation, mappings["specimenReceivedTime"]);
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
  labReportJson: TableJson,
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
  labReportJson: TableJson,
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
 * @param mappings - An object containing the FHIR path mappings.
 * @param columnInfo - An array of column information objects specifying column names and information paths.
 * @returns The JSX representation of the evaluated observation table, or undefined if there are no observations.
 */
export function evaluateObservationTable(
  report: LabReport,
  fhirBundle: Bundle,
  mappings: PathMappings,
  columnInfo: ColumnInfoInput[],
): React.JSX.Element | undefined {
  const observations: Observation[] = (
    report.result?.map((obsRef: Reference) =>
      evaluateReference(fhirBundle, mappings, obsRef.reference ?? ""),
    ) ?? []
  ).filter(
    (observation) =>
      !observation.component &&
      // Make sure there is a component name, but it isn't "Lab Interpretation" as that's handled
      // via the tab on the result's name
      observation.code?.coding.some(
        (c: Coding) => c?.display && c?.display !== "Lab Interpretation",
      ),
  );

  let obsTable;
  if (observations?.length > 0) {
    return (
      <EvaluateTable
        resources={observations}
        mappings={mappings}
        columns={columnInfo}
        className={"margin-y-0"}
        outerBorder={false}
      />
    );
  }
  return obsTable;
}

/**
 * Evaluates diagnostic report data and generates the lab observations for each report.
 * @param report - An object containing an array of result references.
 * @param fhirBundle - The FHIR bundle containing diagnostic report data.
 * @param mappings - An object containing the FHIR path mappings.
 * @returns - An array of React elements representing the lab observations.
 */
export const evaluateDiagnosticReportData = (
  report: LabReport,
  fhirBundle: Bundle,
  mappings: PathMappings,
): React.JSX.Element | undefined => {
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
        const device: Device = evaluateReference(fhirBundle, mappings, ref);
        return safeParse(device.deviceName?.[0]?.name ?? "");
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
  return evaluateObservationTable(report, fhirBundle, mappings, columnInfo);
};

/**
 * Evaluates lab organisms data and generates a lab table for each report.
 * @param report - An object containing an array of lab result references. If it exists, one of the Observations in the report will contain all the lab organisms table data.
 * @param fhirBundle - The FHIR bundle containing diagnostic report data.
 * @param mappings - An object containing the FHIR path mappings.
 * @returns - An array of React elements representing the lab organisms table.
 */
export const evaluateOrganismsReportData = (
  report: LabReport,
  fhirBundle: Bundle,
  mappings: PathMappings,
): React.JSX.Element | undefined => {
  let components: ObservationComponent[] = [];
  let observation: Observation | undefined;

  report.result?.find((obsRef: Reference) => {
    const obs: Observation = evaluateReference(
      fhirBundle,
      mappings,
      obsRef.reference ?? "",
    );
    if (obs.component) {
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
      value: evaluateValue(observation, mappings["observationOrganism"]),
    },
    { columnName: "Antibiotic", infoPath: "observationAntibiotic" },
    { columnName: "Method", infoPath: "observationOrganismMethod" },
    { columnName: "Susceptibility", infoPath: "observationSusceptibility" },
  ];

  return (
    <EvaluateTable
      resources={components}
      mappings={mappings}
      columns={columnInfo}
      className={"margin-y-0"}
      outerBorder={false}
    />
  );
};

/**
 * Evaluates lab information and RR data from the provided FHIR bundle and mappings.
 * @param fhirBundle - The FHIR bundle containing lab and RR data.
 * @param labReports - An array of DiagnosticReport objects
 * @param mappings - An object containing the FHIR path mappings.
 * @param accordionHeadingLevel - Heading level for the title of AccordionLabResults.
 * @returns An array of the Diagnostic reports Elements and Organization Display Data
 */
export const evaluateLabInfoData = (
  fhirBundle: Bundle,
  labReports: any[],
  mappings: PathMappings,
  accordionHeadingLevel?: HeadingLevel,
): LabReportElementData[] | DisplayDataProps[] => {
  // the keys are the organization id, the value is an array of jsx elements of diagnsotic reports
  let organizationElements: ResultObject = {};

  for (const report of labReports) {
    const labReportJson = getLabJsonObject(report, fhirBundle, mappings);

    // If there is no result ID we just display the HTML as is
    if (labReportJson.resultId === undefined) {
      return getUnformattedLabsContent(
        fhirBundle,
        mappings,
        accordionHeadingLevel,
      );
    }

    const content: Array<React.JSX.Element> = getFormattedLabsContent(
      report,
      fhirBundle,
      mappings,
      labReportJson,
    );
    const organizationId = (report.performer?.[0].reference ?? "").replace(
      "Organization/",
      "",
    );
    const element = (
      <AccordionLabResults
        key={report.id}
        title={report.code.coding.find((c: Coding) => c.display).display}
        abnormalTag={checkAbnormalTag(labReportJson)}
        content={content}
        organizationId={organizationId}
        headingLevel={accordionHeadingLevel}
      />
    );
    organizationElements = groupElementByOrgId(
      organizationElements,
      organizationId,
      element,
    );
  }

  return combineOrgAndReportData(organizationElements, fhirBundle, mappings);
};

/**
 * Combines the org display data with the diagnostic report elements
 * @param organizationElements - Object contianing the keys of org data, values of the diagnostic report elements
 * @param fhirBundle - The FHIR bundle containing lab and RR data.
 * @param mappings - An object containing the FHIR path mappings.
 * @returns An array of the Diagnostic reports Elements and Organization Display Data
 */
export const combineOrgAndReportData = (
  organizationElements: ResultObject,
  fhirBundle: Bundle,
  mappings: PathMappings,
): LabReportElementData[] => {
  return Object.keys(organizationElements).map((key: string) => {
    const organizationId = key.replace("Organization/", "");
    const orgData = evaluateLabOrganizationData(
      organizationId,
      fhirBundle,
      mappings,
      organizationElements[key].length,
    );
    return {
      organizationId: organizationId,
      diagnosticReportDataElements: organizationElements[key],
      organizationDisplayDataProps: orgData,
    };
  });
};

/**
 * Finds the Orgnization that matches the id and creates a DisplayDataProps array
 * @param id - id of the organization
 * @param fhirBundle - The FHIR bundle containing lab and RR data.
 * @param mappings - An object containing the FHIR path mappings.
 * @param labReportCount - A number representing the amount of lab reports for a specific organization
 * @returns The organization display data as an array
 */
export const evaluateLabOrganizationData = (
  id: string,
  fhirBundle: Bundle,
  mappings: PathMappings,
  labReportCount: number,
) => {
  const orgMappings = evaluate(fhirBundle, mappings["organizations"]);
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
 * @param orgMappings all the organizations found in the fhir bundle
 * @param matchedOrg the org that matches the id of the lab
 * @returns the matchedOrg with the telecom assigned if applicable
 */
export const findIdenticalOrg = (
  orgMappings: any[],
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
 * @param element - The JSX element to be grouped under the specified organization ID.
 * @returns The updated result object with the element added to the appropriate group.
 */
const groupElementByOrgId = (
  resultObject: ResultObject,
  organizationId: string,
  element: React.JSX.Element,
) => {
  if (resultObject.hasOwnProperty(organizationId)) {
    resultObject[organizationId].push(element);
  } else {
    resultObject[organizationId] = [element];
  }
  return resultObject;
};

/**
 * Retrieves the content for a lab report.
 * @param report - The DiagnosticReport resource.
 * @param fhirBundle - The FHIR Bundle.
 * @param mappings - The PathMappings object containing mappings for extracting data.
 * @param labReportJson - The JSON representation of the lab results HTML.
 * @returns An array of JSX elements representing the lab report content.
 */
function getFormattedLabsContent(
  report: any,
  fhirBundle: Bundle,
  mappings: PathMappings,
  labReportJson: TableJson,
) {
  const labTableDiagnostic = evaluateDiagnosticReportData(
    report,
    fhirBundle,
    mappings,
  );
  const labTableOrganisms = evaluateOrganismsReportData(
    report,
    fhirBundle,
    mappings,
  );
  const rrInfo: DisplayDataProps[] = [
    {
      title: "Analysis Time",
      value: returnAnalysisTime(labReportJson, "Analysis Time"),
      className: "lab-text-content",
    },
    {
      title: "Collection Time",
      value: returnCollectionTime(report, fhirBundle, mappings),
      className: "lab-text-content",
    },
    {
      title: "Received Time",
      value: returnReceivedTime(report, fhirBundle, mappings),
      className: "lab-text-content",
    },
    {
      title: "Specimen (Source)",
      value: returnSpecimenSource(report, fhirBundle, mappings),
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
      <React.Fragment key={"lab-table-diagnostic"}>
        {labTableDiagnostic}
      </React.Fragment>,
    );
  if (labTableOrganisms) {
    content.push(
      <React.Fragment key={"lab-table-oragnisms"}>
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
 * @param mappings - The FHIR path mappings.
 * @param accordionHeadingLevel - Heading level for the Accordion menu title.
 * @returns An array of DisplayDataProps containing the lab results.
 * Note: Even though we only need one DisplayDataProps object for the lab results, returning as an array makes the result of evaluateLabInfoData easier to work with.
 */
function getUnformattedLabsContent(
  fhirBundle: Bundle,
  mappings: PathMappings,
  accordionHeadingLevel: HeadingLevel | undefined,
): DisplayDataProps[] {
  const accordionContent = returnHtmlTableContent(
    fhirBundle,
    mappings["labResultDiv"],
    "",
    false,
    "lab-results-table-from-div",
  );

  return accordionContent
    ? [
        {
          title: "Lab Results",
          value: (
            <AccordionLabResults
              title="All Lab Results"
              abnormalTag={false}
              content={[accordionContent]}
              organizationId="0"
              headingLevel={accordionHeadingLevel}
              className={"padding-bottom-0"}
            />
          ),
          dividerLine: false,
        } as DisplayDataProps,
      ]
    : [];
}
