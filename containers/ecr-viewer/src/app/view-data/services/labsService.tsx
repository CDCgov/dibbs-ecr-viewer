import "server-only";
import React from "react";

import { HeadingLevel, Tag } from "@trussworks/react-uswds";
import {
  Bundle,
  Device,
  DiagnosticReport,
  Observation,
  Organization,
  Specimen,
} from "fhir/r4";
import { Coding, ObservationComponent } from "fhir/r4b";

import { formatDateTime } from "@/app/services/formatDateService";
import {
  formatAddress,
  formatCodeableConcept,
  formatPhoneNumber,
} from "@/app/services/formatService";
import {
  HtmlTableJson,
  HtmlTableJsonRow,
  formatTablesToJSON,
} from "@/app/services/htmlTableService";
import { AccordionItem } from "@/app/types";
import {
  RenderableNode,
  arrayToElement,
  evaluateData,
  noData,
  notEmpty,
  safeParse,
} from "@/app/utils/data-utils";
import {
  evaluateAll,
  evaluateOne,
  evaluateReference,
  evaluateValue,
} from "@/app/utils/evaluate";
import fhirPathMappings from "@/app/utils/evaluate/fhir-paths";
import {
  extractNumbersAndPeriods,
  toKebabCase,
} from "@/app/utils/format-utils";
import {
  DataDisplayList,
  DisplayDataProps,
} from "@/app/view-data/components/DataDisplay";
import EvaluateTable, {
  ColumnInfoInput,
} from "@/app/view-data/components/EvaluateTable";
import { FieldValue } from "@/app/view-data/components/FieldValue";
import { sortResourcesByDate } from "@/app/view-data/utils/fhir-data-utils";

export interface ResultObject {
  [key: string]: AccordionItem[];
}

export interface LabReportElementData {
  organizationId: string;
  diagnosticReportDataItems: AccordionItem[];
  organizationDisplayDataProps: DisplayDataProps[];
}
export interface AbnormalObservationInterpretation {
  code: "AA" | "HH" | "LL" | "HU" | "LU";
  display: string;
}

const ABNORMAL_OBSERVATION_INTERPRETATIONS = {
  AA: {
    display: "Critical Abnormal",
  },
  HH: {
    display: "Critical High",
  },
  LL: {
    display: "Critical Low",
  },
  HU: {
    display: "Significantly High",
  },
  LU: {
    display: "Significantly Low",
  },
} as const;

type AbnormalObservationInterpretationCode =
  keyof typeof ABNORMAL_OBSERVATION_INTERPRETATIONS;

/**
 *
 * @param code HL7 observation interptetation code
 * @returns true if code is in list of abnormal observation interpretation codes
 */
export const isAbnormalObservationInterpretation = (
  code: string,
): code is AbnormalObservationInterpretationCode => {
  return code in ABNORMAL_OBSERVATION_INTERPRETATIONS;
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
): LabReportElementData[] => {
  // the keys are the organization id, the value is an array of jsx elements of diagnostic reports
  let organizationItems: ResultObject = {};
  const jsonLabs = getAllLabJsonObjects(fhirBundle);

  for (const report of labReports) {
    const obs = getObservations(report, fhirBundle);
    const labReportJson = getJsonLab(jsonLabs, obs);

    ensureReportHasDateTime(report, obs);
    const content = getLabsContent(report, obs, fhirBundle, labReportJson);
    const organizationId = (report.performer?.[0].reference ?? "").replace(
      "Organization/",
      "",
    );
    const title = formatCodeableConcept(report.code) ?? "Unknown";
    const item = {
      title: (
        <div className="display-flex flex-row flex-justify flex-align-center gap-05">
          <span>
            {title}
            {renderLabAbnormalityTag(obs, labReportJson)}
          </span>

          {/** inline style due to existing css rules on this button text */}
          <span className="text-base" style={{ fontSize: "1rem" }}>
            {evaluateValue(report, fhirPathMappings.effectiveX)}
          </span>
        </div>
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
  return sortResourcesByDate(
    (report.result || [])
      .map((obsRef) =>
        evaluateReference<Observation>(fhirBundle, obsRef.reference),
      )
      .filter(notEmpty),
    fhirPathMappings.effectiveX,
  );
};

const ensureReportHasDateTime = (
  report: DiagnosticReport,
  obs: Observation[],
) => {
  if (report.effectivePeriod) {
    // The ecr xml requires a period, but in practice the start and end are often the same
    // so we collapse them where we can as it's easier to digest the data
    if (report.effectivePeriod.start === report.effectivePeriod.end) {
      report.effectiveDateTime = report.effectivePeriod.start;
      report.effectivePeriod = undefined;
    }
  }
  if (report.effectiveDateTime) return;

  let startDate: string | undefined;
  let endDate: string | undefined;
  const newestObsDate = evaluateOne(obs.at(0), fhirPathMappings.effectiveX);
  if (typeof newestObsDate === "string") {
    endDate = newestObsDate;
  } else {
    startDate = newestObsDate?.start;
    endDate = newestObsDate?.end;
  }

  const oldestObsDate = evaluateOne(obs.at(-1), fhirPathMappings.effectiveX);
  if (typeof oldestObsDate === "string") {
    startDate = oldestObsDate;
  } else {
    startDate = oldestObsDate?.start || startDate;
  }

  if (startDate === endDate) {
    report.effectiveDateTime = startDate;
  } else {
    report.effectivePeriod = {
      start: startDate,
      end: endDate,
    };
  }
};

const getReportResultId = (observations: Observation[]): string | undefined => {
  // Get reference value (result ID) from Observations
  const observationRefValsArray = observations.flatMap((observation) => {
    const refVal = evaluateAll(
      observation,
      fhirPathMappings.observationReferenceValue,
    );
    return extractNumbersAndPeriods(refVal);
  });
  return [...new Set(observationRefValsArray)].join(", "); // should only be 1
};

/**
 * Retrieves the JSON representation of all lab reports from the labs HTML string.
 * @param jsonLabs - All json lab reports from the HTML
 * @param observations - The DiagnosticReport's observation resources.
 * @returns The JSON representation of the lab reports.
 */
export const getJsonLab = (
  jsonLabs: HtmlTableJson[],
  observations: Observation[],
): HtmlTableJson | undefined => {
  const resultId = getReportResultId(observations);
  if (!resultId) return;

  // Get specified lab report (by reference value)
  return jsonLabs.filter((obj) => obj.resultId?.includes(resultId))?.[0];
};

/**
 * Retrieves the JSON representation of a lab report from the labs HTML string.
 * @param fhirBundle - The FHIR Bundle object containing relevant FHIR resources.
 * @returns The JSON representation of the lab report.
 */
export const getAllLabJsonObjects = (fhirBundle: Bundle): HtmlTableJson[] => {
  // Get lab reports HTML String (for all lab reports) & convert to JSON
  const labsString = evaluateValue(fhirBundle, fhirPathMappings.labResultDiv);
  return formatTablesToJSON(labsString);
};

/**
 * Checks whether the result name of a lab report includes the term "abnormal"
 * @param labReportJson - A JSON object representing the lab report HTML string
 * @returns True if the result name includes "abnormal" (case insensitive), otherwise false. Will also return false if lab does not have JSON object.
 */
export const checkAbnormalTag = (labReportJson?: HtmlTableJson): boolean => {
  if (!labReportJson) {
    return false;
  }
  const labResultName = labReportJson.resultName;

  return labResultName?.toLowerCase().includes("abnormal") ?? false;
};

/**
 * Evaluates FHIR observations for abnormal HL7 interpretation codes
 * @param observations Array of FHIR observations
 * @returns Abnormal observation interpretation or null if none found
 */
export const evaluateAbnormalObservationInterpretation = (
  observations: Observation[],
): AbnormalObservationInterpretation | null => {
  if (!observations || observations.length === 0) {
    return null;
  }

  for (const observation of observations) {
    if (
      !observation.interpretation ||
      observation.interpretation.length === 0
    ) {
      continue;
    }

    for (const interpretation of observation.interpretation) {
      if (!interpretation.coding || interpretation.coding.length === 0) {
        continue;
      }

      for (const coding of interpretation.coding) {
        // Verify this is an HL7 observation interpretation code
        if (
          coding.system !==
          "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation"
        ) {
          continue;
        }

        const code = coding.code;
        if (!code || !isAbnormalObservationInterpretation(code)) {
          continue;
        }

        const interpretationConfig = ABNORMAL_OBSERVATION_INTERPRETATIONS[code];
        return {
          code,
          display: coding.display || interpretationConfig.display,
          color: interpretationConfig.color,
          backgroundColor: interpretationConfig.backgroundColor,
        };
      }
    }
  }

  return null;
};

/**
 * Renders a lab tag for abnormal observation interpretations
 * @param observations Array of FHIR observation resources
 * @param labReportJson Fallback HTML-based lab report data for backwards compatibility
 * @returns React element for the lab tag, or null if no abnormality
 */
export const renderLabAbnormalityTag = (
  observations: Observation[],
  labReportJson?: HtmlTableJson,
): React.ReactNode => {
  

  const abnormalInterpretation =
    evaluateAbnormalObservationInterpretation(observations);
  if (abnormalInterpretation) {
    return (
      <Tag background="#B50909" className="margin-left-105">
        {abnormalInterpretation.display}
      </Tag>
    );
  }

  // Fall back to existing abnormal detection for backwards compatibility
  if (checkAbnormalTag(labReportJson)) {
    return (
      <Tag background="#B50909" className="margin-left-105">
        Abnormal
      </Tag>
    );
  }

  return null;
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
 * Extracts and formats a field value from within a lab report (sourced from HTML string).
 * @param labReportJson - A JSON object representing the lab report HTML string
 * @param fieldName - A string containing the field name for which the value is being searched.
 * @returns A comma-separated string of unique collection times, or a 'No data' JSX element if none are found.
 */
export const returnFieldValueFromLabHtmlString = (
  labReportJson: HtmlTableJson | undefined,
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
  labReportJson: HtmlTableJson | undefined,
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
 * Evaluates diagnostic report data and generates the lab observations for each report.
 * @param obs - An object containing an array of result observations.
 * @param fhirBundle - The FHIR bundle containing diagnostic report data.
 * @returns - An array of React elements representing the lab observations.
 */
export const evaluateDiagnosticReportData = (
  obs: Observation[],
  fhirBundle: Bundle,
): React.JSX.Element | undefined => {
  if (!obs.length) return undefined;

  const columnInfo: ColumnInfoInput[] = [
    {
      columnName: "Component",
      infoPath: "code",
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
      columnName: "Result Status",
      infoPath: "observationResultStatus",
      className: "minw-10 width-20",
    },
    {
      columnName: "Lab Comment",
      infoPath: "noteText",
      hiddenBaseText: "comment",
      applyToValue: (v) => <FieldValue>{safeParse(v)}</FieldValue>,
      className: "minw-10 width-20",
    },
  ];

  const dxObs = obs.filter((observation) => {
    if (observation.component) return false;
    const hasValidCoding = observation.code?.coding?.some(
      (c: Coding) =>
        !(c?.code === "56850-1" || c?.display === "Lab Interpretation"),
    );
    return !!hasValidCoding;
  });

  if (dxObs.length > 0) {
    return (
      <EvaluateTable
        resources={dxObs}
        columns={columnInfo}
        className="margin-y-0"
        outerBorder={false}
      />
    );
  }
};

/**
 * Evaluates lab organisms data and generates a lab table for each report.
 * @param obs - An array of observations on the diagnostic report
 * @returns - An array of React elements representing the lab organisms table.
 */
export const evaluateOrganismsReportData = (
  obs: Observation[],
): React.JSX.Element | undefined => {
  if (!obs.length) return undefined;

  let components: ObservationComponent[] = [];
  let observation: Observation | undefined;

  obs.forEach((ob) => {
    if (ob?.component) {
      observation = ob;
    }
  });

  if (observation === undefined) return;

  components = observation.component!;
  const columnInfo: ColumnInfoInput[] = [
    {
      columnName: "Organism",
      value: evaluateValue(observation, fhirPathMappings.code),
    },
    {
      columnName: "Antibiotic",
      infoPath: "codeableConceptDisplay",
    },
    {
      columnName: "Method",
      infoPath: "observationOrganismMethod",
    },
    {
      columnName: "Susceptibility",
      infoPath: "valueX",
    },
  ];

  return (
    <EvaluateTable
      resources={components}
      resourceBasePath="Observation.component"
      columns={columnInfo}
      className="margin-y-0"
      outerBorder={false}
    />
  );
};

/**
 * Combines the org display data with the diagnostic report elements
 * @param organizationItems - Object containing the keys of org data, values of the diagnostic report elements
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
 * Finds the Organization that matches the id and creates a DisplayDataProps array
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
 * @param obs - The observations associated with the report
 * @param fhirBundle - The FHIR Bundle.
 * @param labReportJson - The JSON representation of the lab results from HTML.
 * @returns An array of JSX elements representing the lab report content.
 */
const getLabsContent = (
  report: DiagnosticReport,
  obs: Observation[],
  fhirBundle: Bundle,
  labReportJson?: HtmlTableJson,
) => {
  const labTableDiagnostic = evaluateDiagnosticReportData(obs, fhirBundle);
  const labTableOrganisms = evaluateOrganismsReportData(obs);
  const labSpecimen = evaluateReference<Specimen>(
    fhirBundle,
    report.specimen?.[0]?.reference,
  );

  const rrInfo: DisplayDataProps[] = [
    {
      title: "Observation Time",
      value: evaluateValue(report, fhirPathMappings.effectiveX) || noData,
      className: "lab-text-content",
    },
    {
      title: "Analysis Time",
      value: returnAnalysisTime(labReportJson, "Analysis Time"),
      className: "lab-text-content",
    },
    {
      title: "Collection Time",
      value:
        evaluateValue(labSpecimen, fhirPathMappings.specimenCollectionTime) ||
        noData,
      className: "lab-text-content",
    },
    {
      title: "Received Time",
      value:
        evaluateValue(labSpecimen, fhirPathMappings.specimenReceivedTime) ||
        noData,
      className: "lab-text-content",
    },
    {
      title: "Specimen (Source)",
      value:
        evaluateValue(labSpecimen, fhirPathMappings.specimenSource) || noData,
      className: "lab-text-content",
    },
    {
      title: "Anatomical Location/Laterality",
      value:
        evaluateValue(labSpecimen, fhirPathMappings.specimenBodySite) ||
        returnFieldValueFromLabHtmlString(
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
      title: "Result Status",
      value:
        evaluateValue(report, fhirPathMappings.diagnosticReportStatus) ||
        noData,
      className: "lab-text-content",
    },
    {
      title: "Narrative",
      value: returnFieldValueFromLabHtmlString(labReportJson, "Narrative"),
      className: "lab-text-content",
    },
  ];

  const { availableData, unavailableData } = evaluateData(rrInfo);
  const h6ClassName = "bg-gray-5 margin-x-neg-205 padding-y-2 padding-x-205";

  return (
    <>
      {labTableDiagnostic}
      {labTableOrganisms}

      {availableData.length > 0 && (
        <h6
          // inline styling to overwrite usa-prose nested style
          style={{ marginTop: "-1rem" }}
          className={h6ClassName}
        >
          Available lab information
        </h6>
      )}
      <DataDisplayList items={availableData} />

      {unavailableData.length > 0 && (
        <h6 className={h6ClassName}>Unavailable lab information</h6>
      )}
      <DataDisplayList items={unavailableData} />
    </>
  );
};
