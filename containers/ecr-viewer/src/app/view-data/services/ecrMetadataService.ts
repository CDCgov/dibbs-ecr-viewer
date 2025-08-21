import { Bundle, Observation, Organization } from "fhir/r4";

import { formatDateTime } from "@/app/services/formatDateService";
import {
  formatAddress,
  formatCodeableConcept,
  formatContactPoint,
  formatName,
} from "@/app/services/formatService";
import {
  CompleteData,
  noData,
  evaluateData,
  RenderableNode,
} from "@/app/utils/data-utils";
import {
  eicrProcessingReasonMap,
  ersdWarningSuggestedSolutionsMap,
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
import { getReportabilityInfo } from "./reportabilityService";

// TODO ANGELA: DELETE
export interface ReportableConditionsOLD {
  [condition: string]: {
    [trigger: string]: Set<string | undefined>;
  };
}

// {
//   "Zika Virus Disease": {
//     "travel history": Set { "State Department of Health Routing Agency" },
//     "positive lab result": Set { "Local Public Health Agency" }
//   },
//   "Measles": {
//     "rash and fever": Set { "Provider Facility A" },
//     "positive lab result": Set { "Local Public Health Agency", "Provider Facility B" }
//   },
//   "Tuberculosis": {
//     "positive skin test": Set { "Provider Facility C" }
//   }
// }

export interface ReportableConditions {
  [condition: string]: ReportabilityInfo[];
}

export interface ReportabilityInfo {
  participants: Participant[];
  rules: Set<string>;
  reasons: Set<string>;
}

export interface Participant {
  name: string;
  role: string;
}

// {
//   "Zika Virus Disease":
//   [
//       {
//         "rules authoring agency": "Agency A",
//         "routing entity": "Agency B",
//         "responsible party": "Agency A"
//         "rule summaries": [
//           "Rule A", "Rule B"
//         ]
//         "reasons": [
//           "Reason A"
//         ]
//       },
//       {
//         "rules authoring agency": "Agency C",
//         "routing entity": "Agency C",
//         "responsible party": "Agency C"
//         "rule summaries": [
//           "Rule A", "Rule B"
//         ]
//         "reasons": []
//       },
//   ],
//   "Measles": [
//     {
//         "rules authoring agency": "Agency A",
//         "routing entity": "Agency A",
//         "responsible party": "Agency A"
//         "rule summaries": [
//           "Rule A", "Rule B"
//         ]
//         "reasons": [
//           "Reason A"
//         ]
//     }
//   ]
// }

interface EcrMetadata {
  eicrDetails: CompleteData;
  ecrCustodianDetails: CompleteData;
  rrConditions: ReportableConditions;
  eicrAuthorDetails: CompleteData[];
  eRSDProcessingInfo: ERSDInfo | undefined;
}

export interface ERSDInfo {
  success: boolean;
  eRSDWarning?: ERSDWarning;
}

export interface ERSDWarning {
  warning: string;
  versionUsed?: RenderableNode;
  versionExpected?: RenderableNode;
  suggestedSolution?: RenderableNode;
}

const unknownWarningText = "eICR processed with a warning or error (unknown)";
export const unknownWarning: ERSDInfo = {
  success: false,
  eRSDWarning: {
    warning: unknownWarningText,
    versionUsed: noData,
    versionExpected: noData,
    suggestedSolution: noData,
  },
};

/**
 * Evaluates eCR metadata from the FHIR bundle and formats it into structured data for display.
 * @param fhirBundle - The FHIR bundle containing eCR metadata.
 * @returns An object containing evaluated and formatted eCR metadata.
 */
export const evaluateEcrMetadata = (fhirBundle: Bundle): EcrMetadata => {
  const rrConditions = evaluateAll(fhirBundle, fhirPathMappings.rrConditions);
  const reportableConditionsList: ReportableConditions = {};

  for (const condition of rrConditions) {
    const name =
      formatCodeableConcept(condition.valueCodeableConcept) ??
      "Unknown Condition";
    const rrInfo: ReportabilityInfo[] = getReportabilityInfo(
      fhirBundle,
      condition,
    );

    if (!reportableConditionsList[name]) {
      reportableConditionsList[name] = [];
    }
    reportableConditionsList[name].push(...rrInfo);
  }

  const custodianRef = evaluateOne(
    fhirBundle,
    fhirPathMappings.eicrCustodianRef,
  );
  const custodian = evaluateReference<Organization>(fhirBundle, custodianRef);

  const eicrReleaseVersion = (fhirBundle: Bundle) => {
    const releaseVersionMap: Record<string, string> = {
      "2016-12-01": "R1.1 (2016-12-01)",
      "2021-01-01": "R3 (2021-01-01)",
      "2022-05-01": "R3.1 (2022-05-01)",
    };

    const releaseVersion: string = evaluateValue(
      fhirBundle,
      fhirPathMappings.eicrReleaseVersion,
    );

    return releaseVersionMap[releaseVersion] || releaseVersion;
  };

  const fhirEICRProcessingStatus = evaluateValue(
    fhirBundle,
    fhirPathMappings.eICRProcessingStatus,
  );
  const fhirEICRProcessingStatusReasonObs = evaluateOne(
    fhirBundle,
    fhirPathMappings.eICRProcessingStatusReason,
  );

  function geteRSDInfo(
    processingStatus: string | undefined,
    reasonObs: Observation | undefined,
  ): ERSDInfo | undefined {
    if (processingStatus === "RRVS19") {
      return { success: true };
    } else if (processingStatus && !reasonObs) {
      return unknownWarning;
    } else if (!processingStatus && !reasonObs) {
      return undefined;
    }

    const coding = reasonObs?.valueCodeableConcept?.coding?.[0];
    const warningCode = coding?.code ?? "";
    const warningName =
      coding?.display ||
      eicrProcessingReasonMap[warningCode] ||
      unknownWarningText;

    let versionUsed: string | undefined;
    let versionExpected: string | undefined;

    reasonObs?.component?.forEach((component) => {
      const detailVal = component.valueString;
      const detailCode = component.code?.coding?.[0]?.code;
      const detailDisplay = component.code?.coding?.[0]?.display;

      if (!detailCode) return;

      if (detailCode === "RRVS33") {
        versionExpected = detailVal;
      } else {
        versionUsed = detailDisplay
          ? `${detailDisplay}: ${detailVal}`
          : detailVal;
      }
    });
    return {
      success: false,
      eRSDWarning: {
        warning: warningName,
        versionUsed: versionUsed || noData,
        versionExpected: versionExpected || noData,
        suggestedSolution:
          ersdWarningSuggestedSolutionsMap[warningCode] || noData,
      },
    };
  }

  const eRSDProcessingInfo: ERSDInfo | undefined = geteRSDInfo(
    fhirEICRProcessingStatus,
    fhirEICRProcessingStatusReasonObs,
  );

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
    rrConditions: reportableConditionsList,
    eRSDProcessingInfo,
    eicrAuthorDetails: eicrAuthorDetails.map((details) =>
      evaluateData(details)
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
