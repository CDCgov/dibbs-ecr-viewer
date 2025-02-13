import {
  formatAddress,
  formatContactPoint,
  formatName,
} from "@/app/services/formatService";
import {
  CompleteData,
  evaluateData,
  PathMappings,
} from "@/app/utils/data-utils";
import { Bundle, Coding, Observation, Organization, Reference } from "fhir/r4";
import { evaluate } from "@/app/utils/evaluate";
import { evaluatePractitionerRoleReference } from "./evaluateFhirDataService";
import { DisplayDataProps } from "@/app/view-data/components/DataDisplay";
import { evaluateReference } from "@/app/services/evaluateFhirDataService";
import { formatDateTime } from "./formatDateService";

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
  eRSDWarnings: ERSDWarning[];
}

export interface ERSDWarning {
  warning: string;
  versionUsed: string;
  expectedVersion: string;
  suggestedSolution: string;
}

/**
 *  Gets the first display value from a coding array.
 * @param coding - The coding array to get the display from.
 * @returns The display value from the coding array.
 */
export const getCodingDisplay = (coding: Coding[] | undefined) => {
  if (!coding) {
    return;
  }
  return coding.find((c) => c.display)?.display;
};

/**
 * Evaluates eCR metadata from the FHIR bundle and formats it into structured data for display.
 * @param fhirBundle - The FHIR bundle containing eCR metadata.
 * @param mappings - The object containing the fhir paths.
 * @returns An object containing evaluated and formatted eCR metadata.
 */
export const evaluateEcrMetadata = (
  fhirBundle: Bundle,
  mappings: PathMappings,
): EcrMetadata => {
  const rrDetails: Observation[] = evaluate(fhirBundle, mappings.rrDetails);

  let reportableConditionsList: ReportableConditions = {};

  for (const condition of rrDetails) {
    const name =
      condition.valueCodeableConcept?.text ||
      getCodingDisplay(condition.valueCodeableConcept?.coding) ||
      "Unknown Condition"; // Default to "Unknown Condition" if no name is found, this should almost never happen, but it would still be a valid eCR.
    const triggers = condition.extension
      ?.filter(
        (x) =>
          x.url ===
          "http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-determination-of-reportability-rule-extension",
      )
      .map((x) => x.valueString);
    if (!reportableConditionsList[name]) {
      reportableConditionsList[name] = {};
    }

    if (
      !Array.isArray(triggers) ||
      !triggers.every((item) => typeof item === "string")
    ) {
      throw new Error("No triggers found for reportable condition");
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

  const custodianRef = evaluate(fhirBundle, mappings.eicrCustodianRef)[0] ?? "";
  const custodian: Organization = evaluateReference(
    fhirBundle,
    mappings,
    custodianRef,
  );

  const eicrReleaseVersion = (fhirBundle: any, mappings: any) => {
    const releaseVersion = evaluate(fhirBundle, mappings.eicrReleaseVersion)[0];
    if (releaseVersion === "2016-12-01") {
      return "R1.1 (2016-12-01)";
    } else if (releaseVersion === "2021-01-01") {
      return "R3.1 (2021-01-01)";
    } else {
      return releaseVersion;
    }
  };

  const fhirERSDWarnings = evaluate(fhirBundle, mappings.eRSDwarnings);
  let eRSDTextList: ERSDWarning[] = [];

  for (const warning of fhirERSDWarnings) {
    if (warning.code === "RRVS34") {
      eRSDTextList.push({
        warning:
          "Sending organization is using an malformed eRSD (RCTC) version",
        versionUsed: "2020-06-23",
        expectedVersion:
          "Sending organization should be using one of the following: 2023-10-06, 1.2.2.0, 3.x.x.x.",
        suggestedSolution:
          "The trigger code version your organization is using could not be determined. The trigger codes may be out date. Please have your EHR administrators update the version format for complete eCR functioning.",
      });
    } else if (warning.code === "RRVS29") {
      eRSDTextList.push({
        warning:
          "Sending organization is using an outdated eRSD (RCTC) version",
        versionUsed: "2020-06-23",
        expectedVersion:
          "Sending organization should be using one of the following: 2023-10-06, 1.2.2.0, 3.x.x.x.",
        suggestedSolution:
          "The trigger code version your organization is using is out-of-date. Please have your EHR administration install the current version for complete eCR functioning.",
      });
    }
  }

  const eicrDetails: DisplayDataProps[] = [
    {
      title: "eICR ID",
      toolTip:
        "Unique document ID for the eICR that originates from the medical record. Different from the Document ID that NBS creates for all incoming records.",
      value: evaluate(fhirBundle, mappings.eicrIdentifier)[0],
    },
    {
      title: "Date/Time eCR Created",
      value: formatDateTime(
        evaluate(fhirBundle, mappings.dateTimeEcrCreated)[0],
      ),
    },
    {
      title: "eICR Release Version",
      value: eicrReleaseVersion(fhirBundle, mappings),
    },
    {
      title: "EHR Manufacturer Model Name",
      value: evaluate(fhirBundle, mappings.ehrManufacturerModel)[0],
    },
    {
      title: "EHR Software Name",
      value: evaluate(fhirBundle, mappings.ehrSoftware)[0],
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

  const eicrAuthorDetails = evaluateEcrAuthorDetails(fhirBundle, mappings);

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

const evaluateEcrAuthorDetails = (
  fhirBundle: Bundle,
  mappings: PathMappings,
): DisplayDataProps[][] => {
  const authorRefs: Reference[] = evaluate(
    fhirBundle,
    mappings["compositionAuthorRefs"],
  );

  const authorDetails: DisplayDataProps[][] = [];
  authorRefs.forEach((ref) => {
    if (ref.reference?.includes("PractitionerRole/")) {
      const practitionerRoleRef = ref?.reference;
      const { practitioner, organization } = evaluatePractitionerRoleReference(
        fhirBundle,
        mappings,
        practitionerRoleRef ?? "",
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
