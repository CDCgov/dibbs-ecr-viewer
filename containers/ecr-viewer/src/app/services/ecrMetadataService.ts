import { Bundle, Organization } from "fhir/r4";

import { CompleteData, evaluateData, noData } from "@/app/utils/data-utils";
import {
  eicrProcessingReasonMap,
  ersdWarningsSuggestedSolutionsMap,
  ReasonDetailMap,
} from "@/app/utils/eicr-processing-utils";
import {
  evaluateAll,
  evaluateOne,
  evaluateReference,
  evaluateValue,
} from "@/app/utils/evaluate";
import fhirPathMappings from "@/app/utils/evaluate/fhir-paths";
import { DisplayDataProps } from "@/app/view-data/components/DataDisplay";

import { evaluatePractitionerRoleReference } from "./evaluateFhirDataService";
import { formatDateTime } from "./formatDateService";
import {
  formatAddress,
  formatCodeableConcept,
  formatContactPoint,
  formatName,
} from "./formatService";
import { getReportabilitySummaries } from "./reportabilityService";

export interface ReportableConditions {
  [condition: string]: {
    [trigger: string]: Set<string | undefined>;
  };
}

interface EcrMetadata {
  eicrDetails: CompleteData;
  ecrCustodianDetails: CompleteData;
  rrDetails: ReportableConditions;
  eicrAuthorDetails: CompleteData[];
  eRSDWarnings: ERSDWarning;
}

export interface ERSDWarning {
  warning?: string;
  versionUsed?: string;
  versionExpected?: string;
  suggestedSolution?: string;
}

/**
 * Evaluates eCR metadata from the FHIR bundle and formats it into structured data for display.
 * @param fhirBundle - The FHIR bundle containing eCR metadata.
 * @returns An object containing evaluated and formatted eCR metadata.
 */
export const evaluateEcrMetadata = (fhirBundle: Bundle): EcrMetadata => {
  const rrDetails = evaluateAll(fhirBundle, fhirPathMappings.rrDetails);

  const reportableConditionsList: ReportableConditions = {};

  for (const condition of rrDetails) {
    const name =
      formatCodeableConcept(condition.valueCodeableConcept) ??
      "Unknown Condition";
    const triggers = getReportabilitySummaries(condition);

    if (!reportableConditionsList[name]) {
      reportableConditionsList[name] = {};
    }

    if (!triggers.size) {
      console.error("No triggers found for reportable condition");
    }

    triggers.forEach((trigger) => {
      if (!reportableConditionsList[name][trigger]) {
        reportableConditionsList[name][trigger] = new Set();
      }

      condition.performer?.forEach((performer) =>
        reportableConditionsList[name][trigger].add(performer.display),
      );
    });
  }

  const custodianRef = evaluateOne(
    fhirBundle,
    fhirPathMappings.eicrCustodianRef,
  );
  const custodian = evaluateReference<Organization>(fhirBundle, custodianRef);

  const eicrReleaseVersion = (fhirBundle: Bundle) => {
    const releaseVersion: string = evaluateValue(
      fhirBundle,
      fhirPathMappings.eicrReleaseVersion,
    );
    if (releaseVersion === "2016-12-01") {
      return "R1.1 (2016-12-01)";
    } else if (releaseVersion === "2021-01-01") {
      return "R3.1 (2021-01-01)";
    } else {
      return releaseVersion;
    }
  };

  const fhirEICRProcessingStatus = evaluateValue(
    fhirBundle,
    fhirPathMappings.eICRProcessingStatus,
  );
  const fhirEICRProcessingStatusReasonObs = evaluateOne(
    fhirBundle,
    fhirPathMappings.eICRProcessingStatusReason,
  );

  const eRSDTextList: ERSDWarning =
    fhirEICRProcessingStatus &&
    fhirEICRProcessingStatus !== "RRVS19" &&
    fhirEICRProcessingStatusReasonObs
      ? (() => {
          const coding =
            fhirEICRProcessingStatusReasonObs.valueCodeableConcept?.coding?.[0];
          const warningCode = coding?.code;
          const warningName =
            coding?.display || eicrProcessingReasonMap[warningCode ?? ""] || "";

          let versionUsed: string | undefined;
          let versionExpected: string | undefined;

          (fhirEICRProcessingStatusReasonObs.component ?? []).forEach(
            (component) => {
              const detailVal = component.valueString;
              const detailCode = component.code?.coding?.[0]?.code;
              const detailDisplay = component.code?.coding?.[0]?.display;

              if (!detailCode) return;

              if (
                ReasonDetailMap[warningCode as keyof typeof ReasonDetailMap] ===
                detailCode
              ) {
                versionUsed = detailDisplay
                  ? `${detailDisplay}: ${detailVal}`
                  : detailVal;
              } else if (detailCode === "RRVS33") {
                versionExpected = detailVal;
              }
            },
          );
          return warningName || versionUsed || versionExpected || warningCode
            ? {
                warning: warningName ?? noData,
                versionUsed: versionUsed ? versionUsed : noData,
                versionExpected: versionExpected ? versionExpected : noData,
                suggestedSolution:
                  ersdWarningsSuggestedSolutionsMap[warningCode ?? ""] ??
                  noData,
              }
            : {};
        })()
      : {};
  const eicrDetails: DisplayDataProps[] = [
    {
      title: "eICR ID",
      toolTip:
        "Unique document ID for the eICR that originates from the medical record. Different from the Document ID that NBS creates for all incoming records.",
      value: evaluateOne(fhirBundle, fhirPathMappings.eicrIdentifier),
    },
    {
      title: "Date/Time eCR Created",
      value: formatDateTime(
        evaluateOne(fhirBundle, fhirPathMappings.dateTimeEcrCreated),
      ),
    },
    {
      title: "eICR Release Version",
      value: eicrReleaseVersion(fhirBundle),
    },
    {
      title: "EHR Manufacturer Model Name",
      value: evaluateOne(fhirBundle, fhirPathMappings.ehrManufacturerModel),
    },
    {
      title: "EHR Software Name",
      value: evaluateValue(fhirBundle, fhirPathMappings.ehrSoftware),
    },
  ];

  const ecrCustodianDetails: DisplayDataProps[] = [
    {
      title: "Custodian ID",
      value: custodian?.identifier?.[0]?.value,
    },
    {
      title: "Custodian Name",
      value: custodian?.name,
    },
    {
      title: "Custodian Address",
      value: formatAddress(custodian?.address?.[0]),
    },
    {
      title: "Custodian Contact",
      value: formatContactPoint(custodian?.telecom),
    },
  ];

  const eicrAuthorDetails = evaluateEcrAuthorDetails(fhirBundle);

  return {
    eicrDetails: evaluateData(eicrDetails),
    ecrCustodianDetails: evaluateData(ecrCustodianDetails),
    rrDetails: reportableConditionsList,
    eRSDWarnings: eRSDTextList,
    eicrAuthorDetails: eicrAuthorDetails.map((details) =>
      evaluateData(details),
    ),
  };
};

const evaluateEcrAuthorDetails = (fhirBundle: Bundle): DisplayDataProps[][] => {
  const authorRefs = evaluateAll(
    fhirBundle,
    fhirPathMappings.compositionAuthorRefs,
  );

  const authorDetails: DisplayDataProps[][] = [];
  authorRefs.forEach((ref) => {
    if (ref.reference?.includes("PractitionerRole/")) {
      const practitionerRoleRef = ref?.reference;
      const { practitioner, organization } = evaluatePractitionerRoleReference(
        fhirBundle,
        practitionerRoleRef,
      );

      authorDetails.push([
        {
          title: "Author Name",
          value: formatName(practitioner?.name?.[0]),
        },
        {
          title: "Author Address",
          value: practitioner?.address?.map((address) =>
            formatAddress(address),
          ),
        },
        {
          title: "Author Contact",
          value: formatContactPoint(practitioner?.telecom),
        },
        {
          title: "Author Facility Name",
          value: organization?.name,
        },
        {
          title: "Author Facility Address",
          value: organization?.address?.map((address) =>
            formatAddress(address),
          ),
        },
        {
          title: "Author Facility Contact",
          value: formatContactPoint(organization?.telecom),
        },
      ]);
    }
  });

  if (authorDetails.length === 0) {
    authorDetails.push([
      {
        title: "Author Name",
        value: null,
      },
      {
        title: "Author Address",
        value: null,
      },
      {
        title: "Author Contact",
        value: null,
      },
      {
        title: "Author Facility Name",
        value: null,
      },
      {
        title: "Author Facility Address",
        value: null,
      },
      {
        title: "Author Facility Contact",
        value: null,
      },
    ]);
  }

  return authorDetails;
};
