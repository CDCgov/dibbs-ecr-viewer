import "server-only";
import React, { ReactNode } from "react";

import { HeadingLevel, Tag } from "@trussworks/react-uswds";
import {
  Coding,
  Composition,
  Device,
  DiagnosticReport,
  Element,
  Observation,
  ObservationComponent,
  Organization,
  PractitionerRole,
  Reference,
  Resource,
  Specimen,
} from "fhir/r4";

import {
  formatDateTime,
  formatStartEndDateTime,
} from "@/app/services/formatDateService";
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
  evaluateReference2,
  evaluateValue,
} from "@/app/utils/evaluate";
import fhirPathMappings from "@/app/utils/evaluate/fhir-paths";
import {
  extractNumbersAndPeriods,
  stringSort,
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
import {
  FhirIndex,
  getOneResourceByType,
  getResourcesByType,
} from "@/app/view-data/services/fhirResourcesIndexService";

export interface ResultObject {
  [key: string]: AccordionItem[];
}

export interface LabReportElementData {
  organizationId: string;
  diagnosticReportDataItems: AccordionItem[];
  organizationDisplayDataProps: DisplayDataProps[];
  subNavMetadata: {
    title: string;
    id: string;
  };
}

type LabResultSource = DiagnosticReport | Observation;

interface LabResultGroup {
  source: LabResultSource;
  observations: Observation[];
}

const LAB_RESULTS_SECTION_CODE = "30954-2";
const LABORATORY_CATEGORY_SYSTEM =
  "http://terminology.hl7.org/CodeSystem/observation-category";

const ABNORMAL_OBSERVATION_INTERPRETATIONS: Record<string, string> = {
  A: "Abnormal",
  AA: "Critical Abnormal",
  HH: "Critical High",
  LL: "Critical Low",
  HU: "Significantly High",
  LU: "Significantly Low",
};

/**
 * Evaluates lab information and RR data from the provided FHIR bundle and mappings.
 * @param fhirIndex - FHIR resources indexed by type & by ID
 * @param labReports - DiagnosticReports to render. When omitted, reports are
 * discovered from the index and the Composition Results section is used as an
 * Observation-backed fallback when none exist.
 * @param accordionHeadingLevel - Heading level for the title of AccordionLabResults.
 * @returns An array of the Diagnostic reports Elements and Organization Display Data
 */
export const evaluateLabInfoData = (
  fhirIndex: FhirIndex,
  labReports?: DiagnosticReport[],
  accordionHeadingLevel: HeadingLevel = "h5",
): LabReportElementData[] => {
  // The keys identify logical performing organizations and the values are the
  // report/result accordion items attributed to them.
  const organizationItems: ResultObject = {};
  const groups = getLabResultGroups(fhirIndex, labReports);
  if (groups.length === 0) return [];

  const jsonLabs = getAllLabJsonObjects(fhirIndex);

  for (const group of groups) {
    const labReportJson = getJsonLab(
      jsonLabs,
      group.observations,
      group.source,
    );
    const effectiveTime = getLabEffectiveTime(group.source, group.observations);
    const content = getLabsContent(
      group,
      fhirIndex,
      effectiveTime,
      labReportJson,
    );
    const organizationKey = resolveLabOrganization(group, fhirIndex);

    const title = formatCodeableConcept(group.source.code) ?? "Unknown";
    const item = {
      title: (
        <div className="display-flex flex-row flex-justify flex-align-center gap-05">
          <span>
            {title}
            <LabInterpretationTag
              observations={group.observations}
              labReportJson={labReportJson}
            />
          </span>

          {/** inline style due to existing css rules on this button text */}
          <span
            className="text-base flex-shrink-0"
            style={{ fontSize: "1rem" }}
          >
            {effectiveTime}
          </span>
        </div>
      ),
      content,
      expanded: false,
      id: toKebabCase(title),
      headingLevel: accordionHeadingLevel,
    };

    (organizationItems[organizationKey] ??= []).push(item);
  }

  return combineOrgAndReportData(organizationItems, fhirIndex);
};

/**
 * Extracts an array of `Observation` resources from the FHIR index based on a list of observation references.
 * @param report - The lab report containing the results to be processed.
 * @param fhirIndex - FHIR resources indexed by type & by ID
 * @returns An array of `Observation` resources from the FHIR bundle that correspond to the
 * given references. If no matching observations are found or if the input references array is empty, an empty array
 * is returned.
 */
export const getObservations = (
  report: DiagnosticReport,
  fhirIndex: FhirIndex,
): Observation[] => {
  return sortResourcesByDate(
    (report.result || [])
      .map((obsRef) =>
        evaluateReference2<Observation>(fhirIndex, obsRef.reference),
      )
      .filter(notEmpty),
    fhirPathMappings.effectiveX,
  );
};

const isLaboratoryObservation = (observation: Observation): boolean =>
  observation.category?.some((category) =>
    category.coding?.some(
      (coding) =>
        coding.system === LABORATORY_CATEGORY_SYSTEM &&
        coding.code === "laboratory",
    ),
  ) ?? false;

const hasRenderableCode = ({ code }: Pick<Observation, "code">): boolean =>
  Boolean(formatCodeableConcept(code));

const hasRenderableObservationResult = (observation: Observation): boolean => {
  const hasValue = Boolean(evaluateValue(observation, fhirPathMappings.valueX));

  return (
    hasRenderableCode(observation) &&
    (hasValue || Boolean(observation.component?.length))
  );
};

const resolveObservationReference = (
  fhirIndex: FhirIndex,
  reference?: string,
): Observation | undefined => {
  const resource = evaluateReference2<Resource>(fhirIndex, reference);
  return resource?.resourceType === "Observation"
    ? (resource as Observation)
    : undefined;
};

const collectObservationLeaves = (
  observation: Observation,
  fhirIndex: FhirIndex,
  visited: Set<Observation> = new Set(),
): Observation[] => {
  if (visited.has(observation)) return [];
  visited.add(observation);

  const members = (observation.hasMember ?? [])
    .map((member) => resolveObservationReference(fhirIndex, member.reference))
    .filter(notEmpty);

  if (members.length === 0) {
    return hasRenderableObservationResult(observation) ? [observation] : [];
  }

  const leaves = members.flatMap((member) =>
    collectObservationLeaves(member, fhirIndex, visited),
  );

  return leaves.length > 0
    ? leaves
    : hasRenderableObservationResult(observation)
      ? [observation]
      : [];
};

const getResultsSectionReferences = (composition: Composition): Reference[] =>
  composition.section?.find((section) =>
    section.code?.coding?.some(
      (coding) =>
        coding.system === "http://loinc.org" &&
        coding.code === LAB_RESULTS_SECTION_CODE,
    ),
  )?.entry ?? [];

/**
 * Builds the lab groups used by the renderer. DiagnosticReports remain the
 * primary representation. A document with no reports falls back to the root
 * laboratory Observations explicitly listed in the Composition Results
 * section, avoiding duplicate groups for their hasMember children.
 */
export const getLabResultGroups = (
  fhirIndex: FhirIndex,
  labReports?: DiagnosticReport[],
): LabResultGroup[] => {
  const reports =
    labReports ??
    getResourcesByType<DiagnosticReport>(fhirIndex, "DiagnosticReport");
  if (reports.length > 0 || labReports !== undefined) {
    return reports.map((report) => ({
      source: report,
      observations: getObservations(report, fhirIndex),
    }));
  }

  const composition = getResourcesByType<Composition>(
    fhirIndex,
    "Composition",
  )[0];
  if (!composition) return [];

  return getResultsSectionReferences(composition)
    .map((reference) =>
      resolveObservationReference(fhirIndex, reference.reference),
    )
    .filter(notEmpty)
    .filter(isLaboratoryObservation)
    .map((observation): LabResultGroup | undefined => {
      const observations = sortResourcesByDate(
        collectObservationLeaves(observation, fhirIndex),
        fhirPathMappings.effectiveX,
      );
      if (observations.length === 0) return undefined;

      return {
        source: observation,
        observations,
      };
    })
    .filter(notEmpty);
};

const getLabEffectiveTime = (
  source: LabResultSource,
  observations: Observation[],
): string => {
  if (
    source.effectivePeriod?.start &&
    source.effectivePeriod.start === source.effectivePeriod.end
  ) {
    return formatDateTime(source.effectivePeriod.start);
  }
  const sourceEffective = evaluateValue(source, fhirPathMappings.effectiveX);
  if (sourceEffective) return sourceEffective;

  let startDate: string | undefined;
  let endDate: string | undefined;
  const newestObsDate = evaluateOne(
    observations.at(0),
    fhirPathMappings.effectiveX,
  );
  if (typeof newestObsDate === "string") {
    endDate = newestObsDate;
  } else {
    startDate = newestObsDate?.start;
    endDate = newestObsDate?.end;
  }

  const oldestObsDate = evaluateOne(
    observations.at(-1),
    fhirPathMappings.effectiveX,
  );
  if (typeof oldestObsDate === "string") {
    startDate = oldestObsDate;
  } else {
    startDate = oldestObsDate?.start || startDate;
  }

  if (startDate === endDate) {
    return formatDateTime(startDate);
  }

  return formatStartEndDateTime({ start: startDate, end: endDate });
};

const getReportResultId = (
  observations: Observation[],
  source: LabResultSource,
): string | undefined => {
  // Get reference value (result ID) from Observations
  const observationRefValsArray = observations.flatMap((observation) => {
    const refVal = evaluateAll(
      observation,
      fhirPathMappings.observationReferenceValue,
    );
    return extractNumbersAndPeriods(refVal);
  });
  const resultId = [...new Set(observationRefValsArray)].join(", "); // should only be 1
  if (resultId) return resultId;

  // Some observations don't carry the "observation entry reference value"
  // extension the lookup above relies
  // on, so nothing gets matched and every HTML-string-sourced field for
  // this result silently comes up empty. Fall back to the source resource's
  // own identifier(s), which share the same numeric value used in the
  // narrative's <item ID="Result...">.
  const identifierResultIds = evaluateAll(
    source,
    fhirPathMappings.diagnosticReportIdentifierValue,
  ).filter(Boolean);
  if (identifierResultIds.length === 0) return undefined;
  return identifierResultIds.join(", ");
};

/**
 * Checks whether `resultId` is the trailing identifying number of `itemId`,
 * rather than a substring. A plain `itemId.includes(resultId)`
 * can misattribute narrative data to the wrong report: e.g. a resultId of
 * "111.42" is a substring of the unrelated ID "9111.429".
 * @param itemId - The narrative `<item>` ID to search within.
 * @param resultId - The candidate ID to look for, possibly a
 *   comma-separated list of multiple candidate IDs.
 * @returns Whether any candidate in `resultId` matches `itemId`.
 */
export const matchesResultId = (itemId: string, resultId: string): boolean => {
  return resultId
    .split(", ")
    .filter(Boolean)
    .some((candidate) => {
      // Replace "." with "\." - otherwise "111.42" could wrongly match
      // something like "111X42"
      const escaped = candidate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // (^|\.) matches either the start of itemId or a literal dot, and the
      // trailing $ requires the match to run all the way to the end of
      // itemId. So this only matches candidate as the item's trailing
      // identifying number, not a segment buried in the middle - e.g. with
      // candidate "111.42", "Result.1.2.840.114350.111.42" matches, but
      // "Result.9111.429" doesn't (it ends in "429", not "111.42").
      return new RegExp(`(^|\\.)${escaped}$`).test(itemId);
    });
};

/**
 * Retrieves the JSON representation of all lab reports from the labs HTML string.
 * @param jsonLabs - All json lab reports from the HTML
 * @param observations - The result group's observation resources.
 * @param source - The DiagnosticReport or root Observation, used as a
 * fallback match key when no child carries the reference-value extension.
 * @returns The JSON representation of the lab reports.
 */
export const getJsonLab = (
  jsonLabs: HtmlTableJson[],
  observations: Observation[],
  source: LabResultSource,
): HtmlTableJson | undefined => {
  const resultId = getReportResultId(observations, source);
  if (!resultId) return;

  // Get specified lab report (by reference value)
  return jsonLabs.find(
    (obj) => obj.resultId && matchesResultId(obj.resultId, resultId),
  );
};

/**
 * Retrieves the JSON representation of a lab report from the labs HTML string.
 * @param fhirIndex - FHIR resources indexed by type & by ID
 * @returns The JSON representation of the lab report.
 */
export const getAllLabJsonObjects = (fhirIndex: FhirIndex): HtmlTableJson[] => {
  // Get lab reports HTML String (for all lab reports) & convert to JSON
  const compositionLabs = getOneResourceByType<Composition>(
    fhirIndex,
    "Composition",
  );
  const labsString = evaluateValue(
    compositionLabs,
    fhirPathMappings.labResultDiv,
  );
  return formatTablesToJSON(labsString);
};

const isAbnormal = (interpretation: string) => {
  return Object.values(ABNORMAL_OBSERVATION_INTERPRETATIONS).some((v) =>
    interpretation.toLowerCase().includes(v.toLowerCase()),
  );
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

  return !!labResultName && isAbnormal(labResultName);
};

/**
 * Evaluates FHIR observations for abnormal HL7 interpretation codes
 * @param observations Array of FHIR observations
 * @returns Abnormal observation interpretation or null if none found
 */
const evaluateAbnormalInterpretation = (
  observations: Observation[],
): string[] => {
  const abnormalInterpretations = evaluateAll(
    observations,
    fhirPathMappings.observationInterpretation,
  )
    .filter(
      ({ code }) =>
        !!code && ABNORMAL_OBSERVATION_INTERPRETATIONS.hasOwnProperty(code),
    )
    .map(({ code }) => ABNORMAL_OBSERVATION_INTERPRETATIONS[code!]);

  // unique-ify and sort
  return [...new Set(abnormalInterpretations)].sort(stringSort);
};

const InterpretationTag = ({
  isAbnormal,
  children,
}: {
  isAbnormal: boolean;
  children: ReactNode;
}) => (
  <Tag
    background={isAbnormal ? "#B50909" : "#adadad"}
    className="margin-left-105"
  >
    {children}
  </Tag>
);

/**
 * Renders a lab tag for abnormal observation interpretations
 * @param props react props
 * @param props.observations Array of FHIR observation resources
 * @param props.labReportJson Fallback HTML-based lab report data for backwards compatibility
 * @returns React element for the lab tag, or null if no abnormality
 */
export const LabInterpretationTag = ({
  observations,
  labReportJson,
}: {
  observations: Observation[];
  labReportJson?: HtmlTableJson;
}): React.ReactNode => {
  const reportInterpretation = evaluateValue(
    observations,
    fhirPathMappings.labReportInterpretation,
  );
  if (reportInterpretation) {
    return (
      <InterpretationTag isAbnormal={isAbnormal(reportInterpretation)}>
        {reportInterpretation}
      </InterpretationTag>
    );
  }

  const abnormalInterpretations = evaluateAbnormalInterpretation(observations);
  if (abnormalInterpretations.length > 0) {
    return abnormalInterpretations.map((interpretation) => (
      <InterpretationTag key={interpretation} isAbnormal={true}>
        {interpretation}
      </InterpretationTag>
    ));
  }

  // Fall back to existing abnormal detection for backwards compatibility
  if (checkAbnormalTag(labReportJson)) {
    return <InterpretationTag isAbnormal={true}>Abnormal</InterpretationTag>;
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
 * @param fhirIndex - FHIR resources indexed by type & by ID
 * @returns - An array of React elements representing the lab observations.
 */
export const evaluateDiagnosticReportData = (
  obs: Observation[],
  fhirIndex: FhirIndex,
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
        const device = evaluateReference2<Device>(fhirIndex, ref);
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
      evaluateEntry: evaluateLabCommentNotes,
      hiddenBaseText: "comment",
      className: "minw-10 width-20",
    },
  ];

  const dxObs = obs.filter((observation) => {
    if (observation.component) return false;
    const isLabInterpretation = observation.code?.coding?.some(
      (coding: Coding) =>
        coding.code === "56850-1" || coding.display === "Lab Interpretation",
    );
    if (isLabInterpretation) return false;

    return hasRenderableCode(observation);
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

const evaluateLabCommentNotes = (entry: Element) => {
  const notes = evaluateAll(entry, fhirPathMappings.noteText).filter(
    (note) => !/^\s*<tr(?:\s|>)/i.test(note),
  );
  if (notes.length === 0) return "";

  return <FieldValue>{safeParse(notes.join("<br />"))}</FieldValue>;
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

const resolveOrganizationReference = (
  fhirIndex: FhirIndex,
  reference?: string,
): { organization?: Organization; organizationReference?: string } => {
  const performer = evaluateReference2<Resource>(fhirIndex, reference);
  if (performer?.resourceType === "Organization") {
    return {
      organization: performer as Organization,
      organizationReference: reference,
    };
  }

  if (performer?.resourceType !== "PractitionerRole") return {};

  const organizationReference = (performer as PractitionerRole).organization
    ?.reference;
  const organization = evaluateReference2<Resource>(
    fhirIndex,
    organizationReference,
  );

  return organization?.resourceType === "Organization"
    ? { organization: organization as Organization, organizationReference }
    : {};
};

const normalizeOrganizationPart = (value?: string): string =>
  value?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";

const getOrganizationAddressKey = (organization: Organization): string =>
  normalizeOrganizationPart(formatAddress(organization.address?.[0]));

const getOrganizationDetailsKey = (
  organization: Organization,
): string | undefined => {
  const name = normalizeOrganizationPart(organization.name);
  const address = getOrganizationAddressKey(organization);
  return name && address ? `${name}|${address}` : undefined;
};

const getOrganizationGroupKey = (
  organization?: Organization,
  organizationReference?: string,
): string => {
  if (!organization) return "";
  if (organization.id) return organization.id;

  const detailsKey = getOrganizationDetailsKey(organization);
  if (detailsKey) return `organization-details:${detailsKey}`;

  const identifier = organization.identifier?.find(({ value }) =>
    Boolean(value),
  );
  if (identifier?.value) {
    return `organization-identifier:${identifier.system ?? ""}|${identifier.value}`;
  }

  return organizationReference ?? "";
};

const resolveLabOrganization = (
  group: LabResultGroup,
  fhirIndex: FhirIndex,
): string => {
  const performerReferences = [
    ...(group.source.performer ?? []),
    ...group.observations.flatMap((observation) => observation.performer ?? []),
  ];
  const visitedReferences = new Set<string>();

  for (const performerReference of performerReferences) {
    const reference = performerReference.reference;
    if (!reference || visitedReferences.has(reference)) continue;
    visitedReferences.add(reference);

    const resolved = resolveOrganizationReference(fhirIndex, reference);
    if (resolved.organization) {
      return getOrganizationGroupKey(
        resolved.organization,
        resolved.organizationReference,
      );
    }
  }

  return "";
};

const getLabOrganizationDisplayData = (
  organization: Organization | undefined,
  labReportCount: number,
): DisplayDataProps[] => {
  const orgAddress = organization?.address?.[0];
  const formattedAddress = formatAddress(orgAddress);
  const contactInfo = formatPhoneNumber(
    organization?.telecom?.find(({ value }) => Boolean(value))?.value,
  );

  return [
    { title: "Lab Performing Name", value: organization?.name ?? "" },
    { title: "Lab Address", value: formattedAddress },
    { title: "Lab Contact", value: contactInfo },
    { title: "Number of Results", value: labReportCount },
  ];
};

/**
 * Combines the org display data with the diagnostic report elements
 * @param organizationItems - Object containing the keys of org data, values of the diagnostic report elements
 * @param fhirIndex - FHIR resources indexed by type & by ID
 * @returns An array of the Diagnostic reports Elements and Organization Display Data
 */
export const combineOrgAndReportData = (
  organizationItems: ResultObject,
  fhirIndex: FhirIndex,
): LabReportElementData[] => {
  return Object.keys(organizationItems).map((key: string) => {
    const organizationId = key.replace("Organization/", "");
    const orgData = evaluateLabOrganizationData(
      organizationId,
      fhirIndex,
      organizationItems[key].length,
    );

    // Create unique IDs for Side Nav
    const orgName = (orgData[0].value as string) || undefined;
    const displayOrg = (orgName || "Unknown Organization").trim();
    const subNavTitle = `Lab Results from ${displayOrg}`;
    const subNavOrganizationId =
      organizationId.startsWith("organization-") ||
      organizationId.startsWith("urn:")
        ? toKebabCase(organizationId)
        : organizationId;
    const subNavId = `${toKebabCase(subNavTitle)}${
      subNavOrganizationId ? `-${subNavOrganizationId}` : ""
    }`;

    return {
      organizationId,
      diagnosticReportDataItems: organizationItems[key],
      organizationDisplayDataProps: orgData,
      subNavMetadata: { title: subNavTitle, id: subNavId },
    };
  });
};

/**
 * Finds the Organization that matches an ID or exact reference and creates a DisplayDataProps array
 * @param idOrReference - organization logical ID or exact reference
 * @param fhirIndex - FHIR resources indexed by type & by ID
 * @param labReportCount - A number representing the amount of lab reports for a specific organization
 * @returns The organization display data as an array
 */
export const evaluateLabOrganizationData = (
  idOrReference: string,
  fhirIndex: FhirIndex,
  labReportCount: number,
) => {
  const orgMappings = getResourcesByType<Organization>(
    fhirIndex,
    "Organization",
  );
  const referencedResource = evaluateReference2<Resource>(
    fhirIndex,
    idOrReference,
  );
  let matchingOrg =
    referencedResource?.resourceType === "Organization"
      ? (referencedResource as Organization)
      : (orgMappings.find(
          (organization) =>
            organization.id === idOrReference.replace(/^Organization\//, ""),
        ) ??
        orgMappings.find(
          (organization) =>
            getOrganizationGroupKey(organization) === idOrReference,
        ));
  if (matchingOrg) {
    matchingOrg = findIdenticalOrg(orgMappings, matchingOrg);
  }
  return getLabOrganizationDisplayData(matchingOrg, labReportCount);
};

/**
 * Finds an equivalent organization by address and returns a copy enriched
 * with its available telecom data.
 * @param orgMappings a list of all the organizations found in the fhir bundle
 * @param matchedOrg the org that matches the id of the lab
 * @returns the matchedOrg with the telecom assigned if applicable
 */
export const findIdenticalOrg = (
  orgMappings: Organization[],
  matchedOrg: Organization,
): Organization => {
  let result = { ...matchedOrg };
  const matchedAddress = getOrganizationAddressKey(matchedOrg);

  orgMappings.forEach((organization) => {
    if (
      organization !== matchedOrg &&
      matchedAddress &&
      getOrganizationAddressKey(organization) === matchedAddress &&
      organization.telecom?.some(({ value }) => Boolean(value))
    ) {
      result = {
        ...result,
        telecom: organization.telecom,
      };
    }
  });
  return result;
};

/**
 * Retrieves the content for a lab result group.
 * @param group - Normalized DiagnosticReport- or Observation-backed lab data.
 * @param fhirIndex - FHIR resources indexed by type & by ID
 * @param effectiveTime - Formatted effective time for the group.
 * @param labReportJson - The JSON representation of the lab results from HTML.
 * @returns An array of JSX elements representing the lab report content.
 */
const getLabsContent = (
  group: LabResultGroup,
  fhirIndex: FhirIndex,
  effectiveTime: string,
  labReportJson?: HtmlTableJson,
) => {
  const { source, observations: obs } = group;
  const labTableDiagnostic = evaluateDiagnosticReportData(obs, fhirIndex);
  const labTableOrganisms = evaluateOrganismsReportData(obs);

  // DiagnosticReports can reference multiple specimens while Observations
  // carry a single specimen reference. The normalized group supports both.
  const sourceSpecimens =
    source.resourceType === "DiagnosticReport"
      ? (source.specimen ?? [])
      : source.specimen
        ? [source.specimen]
        : [];
  const specimenReferences = [
    ...sourceSpecimens,
    ...obs.flatMap(({ specimen }) => (specimen ? [specimen] : [])),
  ];
  const specimens = [
    ...new Set(
      specimenReferences
        .map((ref) => evaluateReference2<Resource>(fhirIndex, ref.reference))
        .filter((resource): resource is Specimen =>
          Boolean(resource?.resourceType === "Specimen"),
        ),
    ),
  ];

  const getSpecimenFields = (specimen?: Specimen): DisplayDataProps[] => [
    {
      title: "Received Time",
      value:
        evaluateValue(specimen, fhirPathMappings.specimenReceivedTime) ||
        noData,
      className: "lab-text-content",
    },
    {
      title: "Collection Time",
      value:
        evaluateValue(specimen, fhirPathMappings.specimenCollectionTime) ||
        noData,
      className: "lab-text-content",
    },
    {
      title: "Anatomical Location/Laterality",
      value:
        evaluateValue(specimen, fhirPathMappings.specimenBodySite) ||
        returnFieldValueFromLabHtmlString(
          labReportJson,
          "Anatomical Location / Laterality",
        ),
      className: "lab-text-content",
    },
  ];

  const rrInfo: DisplayDataProps[] = [
    {
      title: "Observation Time",
      value: effectiveTime || noData,
      className: "lab-text-content",
    },
    {
      title: "Analysis Time",
      value: returnAnalysisTime(labReportJson, "Analysis Time"),
      className: "lab-text-content",
    },
    {
      title: "Anatomical Region",
      value: returnFieldValueFromLabHtmlString(
        labReportJson,
        "Anatomical Region",
      ),
      className: "lab-text-content",
    },
    // With no specimen to attribute these fields to, fall back to showing
    // them flat instead of under a "Specimen (Source)" group.
    ...(specimens.length === 0 ? getSpecimenFields(undefined) : []),
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
        evaluateValue(source, fhirPathMappings.diagnosticReportStatus) ||
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

      {(availableData.length > 0 || specimens.length > 0) && (
        <h6
          // inline styling to overwrite usa-prose nested style
          style={{ marginTop: "-1rem" }}
          className={h6ClassName}
        >
          Available lab information
        </h6>
      )}
      <DataDisplayList items={availableData} />

      {specimens.map((specimen, i) => {
        const source = evaluateValue(specimen, fhirPathMappings.specimenSource);
        return (
          <React.Fragment key={specimen.id ?? i}>
            <h6 className={h6ClassName}>
              Specimen (Source){source ? `: ${source}` : ""}
            </h6>
            <DataDisplayList items={getSpecimenFields(specimen)} />
          </React.Fragment>
        );
      })}

      {unavailableData.length > 0 && (
        <h6 className={h6ClassName}>Unavailable lab information</h6>
      )}
      <DataDisplayList items={unavailableData} />
    </>
  );
};
