import {
  Address,
  Bundle,
  CodeableConcept,
  Coding,
  Condition,
  Encounter,
  Extension,
  HumanName,
  Location,
  Organization,
  PatientCommunication,
  PatientContact,
  Practitioner,
  PractitionerRole,
  Quantity,
} from "fhir/r4";
import { evaluate } from "@/app/view-data/utils/evaluate";
import * as dateFns from "date-fns";
import { PathMappings, evaluateData, noData } from "../view-data/utils/utils";
import {
  TableRow,
  formatAddress,
  formatContactPoint,
  formatDate,
  formatName,
  formatPhoneNumber,
  formatStartEndDate,
  formatStartEndDateTime,
  toTitleCase,
} from "./formatService";
import fhirpath_r4_model from "fhirpath/fhir-context/r4";
import { Element } from "fhir/r4";
import { DisplayDataProps } from "@/app/view-data/components/DataDisplay";
import { evaluateTravelHistoryTable } from "./socialHistoryService";
import { Path } from "fhirpath";
import { returnTableFromJson } from "../view-data/components/common";
import { toSentenceCase } from "./formatService";

/**
 * Evaluates patient name from the FHIR bundle and formats it into structured data for display.
 * @param fhirBundle - The FHIR bundle containing patient contact info.
 * @param mappings - The object containing the fhir paths.
 * @param isPatientBanner - Whether to format the name for the Patient banner
 * @returns The formatted patient name
 */
export const evaluatePatientName = (
  fhirBundle: Bundle,
  mappings: PathMappings,
  isPatientBanner: boolean,
) => {
  const nameList: HumanName[] = evaluate(fhirBundle, mappings.patientNameList);

  // Return early if there's no name
  if (nameList.length === 0) {
    return;
  }

  if (isPatientBanner) {
    const officialName = nameList.find((n) => n.use === "official");
    return formatName(officialName ?? nameList[0]);
  }

  return nameList
    .map((name) => formatName(name, nameList.length > 1))
    .join("\n");
};

/**
 * Evaluates the patient's race from the FHIR bundle and formats for display.
 * @param fhirBundle - The FHIR bundle containing patient contact info.
 * @param mappings - The object containing the fhir paths.
 * @returns - The patient's race information, including race OMB category and detailed extension (if available).
 */
export const evaluatePatientRace = (
  fhirBundle: Bundle,
  mappings: PathMappings,
) => {
  const raceCat = evaluate(fhirBundle, mappings.patientRace)[0];
  const raceDetailed =
    evaluate(fhirBundle, mappings.patientRaceDetailed)[0] ?? "";

  if (raceDetailed) {
    return raceCat + "\n" + raceDetailed;
  } else {
    return raceCat;
  }
};

/**
 * Evaluates the patients ethnicity from the FHIR bundle and formats for display.
 * @param fhirBundle - The FHIR bundle containing patient contact info.
 * @param mappings - The object containing the fhir paths.
 * @returns - The patient's ethnicity information, including additional ethnicity extension (if available).
 */
export const evaluatePatientEthnicity = (
  fhirBundle: Bundle,
  mappings: PathMappings,
) => {
  const ethnicity = evaluate(fhirBundle, mappings.patientEthnicity)[0] ?? "";
  const ethnicityDetailed =
    evaluate(fhirBundle, mappings.patientEthnicityDetailed)[0] ?? "";

  if (ethnicityDetailed) {
    return ethnicity + "\n" + ethnicityDetailed;
  } else {
    return ethnicity;
  }
};

/**
 * Evaluates patient address from the FHIR bundle and formats it into structured data for display.
 * @param fhirBundle - The FHIR bundle containing patient contact info.
 * @param mappings - The object containing the fhir paths.
 * @returns The formatted patient address
 */
export const evaluatePatientAddress = (
  fhirBundle: Bundle,
  mappings: PathMappings,
) => {
  const addresses = evaluate(
    fhirBundle,
    mappings.patientAddressList,
  ) as Address[];

  if (addresses.length > 0) {
    return addresses
      .map((address) => {
        return formatAddress(address, {
          includeUse: addresses.length > 1,
          includePeriod: true,
        });
      })
      .join("\n\n");
  } else {
    return "";
  }
};

/**
 * Finds correct encounter ID
 * @param fhirBundle - The FHIR bundle containing encounter resources.
 * @param mappings - Path mappings for resolving references.
 * @returns Encounter ID or empty string if not available.
 */
export const evaluateEncounterId = (
  fhirBundle: Bundle,
  mappings: PathMappings,
) => {
  const encounterIDs = evaluate(fhirBundle, mappings.encounterID);
  const filteredIds = encounterIDs
    .filter((id) => /^\d+$/.test(id.value))
    .map((id) => id.value);

  return filteredIds[0] ?? "";
};

/**
 * Calculates the age of a patient to a given date or today, unless DOD exists.
 * @param fhirBundle - The FHIR bundle containing patient information.
 * @param fhirPathMappings - The mappings for retrieving patient date of birth.
 * @param [givenDate] - Optional. The target date to calculate the age. Defaults to the current date if not provided.
 * @returns - The age of the patient in years, or undefined if date of birth is not available or if date of death exists.
 */
export const calculatePatientAge = (
  fhirBundle: Bundle,
  fhirPathMappings: PathMappings,
  givenDate?: string,
) => {
  const patientDOBString = evaluate(fhirBundle, fhirPathMappings.patientDOB)[0];
  const patientDODString = evaluate(fhirBundle, fhirPathMappings.patientDOD)[0];
  if (patientDOBString && !patientDODString && !givenDate) {
    const patientDOB = new Date(patientDOBString);
    return dateFns.differenceInYears(new Date(), patientDOB);
  } else if (patientDOBString && givenDate) {
    const patientDOB = new Date(patientDOBString);
    return dateFns.differenceInYears(new Date(givenDate), patientDOB);
  } else {
    return undefined;
  }
};

/**
 * Calculates Patient Age at Death if DOB and DOD exist, otherwise returns undefined
 * @param fhirBundle - The FHIR bundle containing patient information.
 * @param fhirPathMappings - The mappings for retrieving patient date of birth and date of death.
 * @returns - The age of the patient at death in years, or undefined if date of birth or date of death is not available.
 */
export const calculatePatientAgeAtDeath = (
  fhirBundle: Bundle,
  fhirPathMappings: PathMappings,
) => {
  const patientDOBString = evaluate(fhirBundle, fhirPathMappings.patientDOB)[0];
  const patientDODString = evaluate(fhirBundle, fhirPathMappings.patientDOD)[0];

  if (patientDOBString && patientDODString) {
    const patientDOB = new Date(patientDOBString);
    const patientDOD = new Date(patientDODString);
    return dateFns.differenceInYears(patientDOD, patientDOB);
  } else {
    return undefined;
  }
};

/**
 * Evaluates alcohol use information from the FHIR bundle and formats it into structured data for display.
 * @param fhirBundle - The FHIR bundle containing alcohol use data.
 * @param fhirMappings - The object containing the fhir paths.
 * @returns An array of evaluated and formatted alcohol use data.
 */
export const evaluateAlcoholUse = (
  fhirBundle: Bundle,
  fhirMappings: PathMappings,
) => {
  const alcoholUse = evaluateValue(fhirBundle, fhirMappings.patientAlcoholUse);
  const alcoholIntake = evaluateValue(
    fhirBundle,
    fhirMappings.patientAlcoholIntake,
  );
  let alcoholComment: string | undefined = evaluateValue(
    fhirBundle,
    fhirMappings.patientAlcoholComment,
  );

  if (alcoholComment) {
    alcoholComment = toSentenceCase(alcoholComment);
  }

  return [
    alcoholUse ? `Use: ${alcoholUse}` : null,
    alcoholIntake ? `Intake (standard drinks/week): ${alcoholIntake}` : null,
    alcoholComment ? `Comment: ${alcoholComment}` : null,
  ]
    .filter(Boolean) // Removes null or undefined lines
    .join("\n"); // Joins the remaining lines with newlines
};

/**
 * Evaluates social data from the FHIR bundle and formats it into structured data for display.
 * @param fhirBundle - The FHIR bundle containing social data.
 * @param mappings - The object containing the fhir paths.
 * @returns An array of evaluated and formatted social data.
 */
export const evaluateSocialData = (
  fhirBundle: Bundle,
  mappings: PathMappings,
) => {
  const socialData: DisplayDataProps[] = [
    {
      title: "Tobacco Use",
      value: evaluateValue(fhirBundle, mappings["patientTobaccoUse"]),
    },
    {
      title: "Travel History",
      value: evaluateTravelHistoryTable(fhirBundle, mappings),
      table: true,
    },
    {
      title: "Homeless Status",
      value: evaluateValue(fhirBundle, mappings["patientHomelessStatus"]),
    },
    {
      title: "Pregnancy Status",
      value: evaluateValue(fhirBundle, mappings["patientPregnancyStatus"]),
    },
    {
      title: "Alcohol Use",
      value: evaluateAlcoholUse(fhirBundle, mappings),
    },
    {
      title: "Sexual Orientation",
      value: evaluateValue(fhirBundle, mappings["patientSexualOrientation"]),
    },
    {
      title: "Occupation",
      value: evaluateValue(fhirBundle, mappings["patientCurrentJobTitle"]),
    },
    {
      title: "Religious Affiliation",
      value: evaluateValue(fhirBundle, mappings["patientReligion"]),
    },
    {
      title: "Marital Status",
      value: evaluateValue(fhirBundle, mappings["patientMaritalStatus"]),
    },
  ];
  return evaluateData(socialData);
};

/**
 * Evaluates demographic data from the FHIR bundle and formats it into structured data for display.
 * @param fhirBundle - The FHIR bundle containing demographic data.
 * @param mappings - The object containing the fhir paths.
 * @returns An array of evaluated and formatted demographic data.
 */
export const evaluateDemographicsData = (
  fhirBundle: Bundle,
  mappings: PathMappings,
) => {
  const patientSex = toTitleCase(evaluate(fhirBundle, mappings.patientGender)[0]);

  const demographicsData: DisplayDataProps[] = [
    {
      title: "Patient Name",
      value: evaluatePatientName(fhirBundle, mappings, false),
    },
    {
      title: "DOB",
      value: formatDate(evaluate(fhirBundle, mappings.patientDOB)[0]),
    },
    {
      title: "Current Age",
      value: calculatePatientAge(fhirBundle, mappings)?.toString(),
    },
    {
      title: "Age at Death",
      value: calculatePatientAgeAtDeath(fhirBundle, mappings),
    },
    {
      title: "Vital Status",
      value:
        evaluate(fhirBundle, mappings.patientVitalStatus)[0] === false
          ? "Alive"
          : "Deceased",
    },
    {
      title: "Date of Death",
      value: evaluate(fhirBundle, mappings.patientDOD)[0],
    },
    {
      title: "Sex",
      // Unknown and Other sex options removed to be in compliance with Executive Order 14168
      value: patientSex && ["Male", "Female"].includes(patientSex) ? patientSex : "",
    },
    {
      title: "Race",
      value: evaluatePatientRace(fhirBundle, mappings),
    },
    {
      title: "Ethnicity",
      value: evaluatePatientEthnicity(fhirBundle, mappings),
    },
    {
      title: "Tribal Affiliation",
      value: evaluateValue(fhirBundle, mappings.patientTribalAffiliation),
    },
    {
      title: "Preferred Language",
      value: evaluatePatientLanguage(fhirBundle, mappings),
    },
    {
      title: "Patient Address",
      value: evaluatePatientAddress(fhirBundle, mappings),
    },
    {
      title: "County",
      value: evaluate(fhirBundle, mappings.patientCounty)[0],
    },
    {
      title: "Country",
      value: evaluate(fhirBundle, mappings.patientCountry)[0],
    },
    {
      title: "Contact",
      value: formatContactPoint(evaluate(fhirBundle, mappings.patientTelecom)),
    },
    {
      title: "Emergency Contact",
      value: evaluateEmergencyContact(fhirBundle, mappings),
    },
    {
      title: "Patient IDs",
      toolTip:
        "Unique patient identifier(s) from their medical record. For example, a patient's social security number or medical record number.",
      value: evaluateValue(fhirBundle, mappings.patientIds),
    },
  ];
  return evaluateData(demographicsData);
};

/**
 * Evaluates encounter data from the FHIR bundle and formats it into structured data for display.
 * @param fhirBundle - The FHIR bundle containing encounter data.
 * @param mappings - The object containing the fhir paths.
 * @returns An array of evaluated and formatted encounter data.
 */
export const evaluateEncounterData = (
  fhirBundle: Bundle,
  mappings: PathMappings,
) => {
  const encounterData = [
    {
      title: "Encounter Date/Time",
      value: formatStartEndDateTime(
        evaluate(fhirBundle, mappings["encounterStartDate"])[0],
        evaluate(fhirBundle, mappings["encounterEndDate"])[0],
      ),
    },
    {
      title: "Encounter Type",
      value: evaluate(fhirBundle, mappings["encounterType"])[0],
    },
    {
      title: "Encounter ID",
      value: evaluateEncounterId(fhirBundle, mappings),
    },
    {
      title: "Encounter Diagnosis",
      value: evaluateEncounterDiagnosis(fhirBundle, mappings),
    },
    {
      title: "Encounter Care Team",
      value: evaluateEncounterCareTeamTable(fhirBundle, mappings),
      table: true,
    },
  ];
  return evaluateData(encounterData);
};

/**
 * Evaluates facility data from the FHIR bundle and formats it into structured data for display.
 * @param fhirBundle - The FHIR bundle containing facility data.
 * @param mappings - The object containing the fhir paths.
 * @returns An array of evaluated and formatted facility data.
 */
export const evaluateFacilityData = (
  fhirBundle: Bundle,
  mappings: PathMappings,
) => {
  const facilityContactAddressRef = evaluate(
    fhirBundle,
    mappings["facilityContactAddress"],
  );
  let referenceString;

  if (facilityContactAddressRef[0]) {
    referenceString = facilityContactAddressRef[0].reference;
  }
  const facilityContactAddress = referenceString
    ? (evaluateReference(fhirBundle, mappings, referenceString)
        ?.address?.[0] as Address)
    : undefined;

  const facilityData = [
    {
      title: "Facility Name",
      value: evaluate(fhirBundle, mappings["facilityName"])[0],
    },
    {
      title: "Facility Address",
      value: formatAddress(
        evaluate(fhirBundle, mappings["facilityAddress"])[0],
      ),
    },
    {
      title: "Facility Contact Address",
      value: formatAddress(facilityContactAddress),
    },
    {
      title: "Facility Contact",
      value: formatPhoneNumber(
        evaluate(fhirBundle, mappings["facilityContact"])[0],
      ),
    },
    {
      title: "Facility Type",
      value: evaluate(fhirBundle, mappings["facilityType"])[0],
    },
    {
      title: "Facility ID",
      value: evaluateFacilityId(fhirBundle, mappings),
    },
  ];
  return evaluateData(facilityData);
};
/**
 * Evaluates provider data from the FHIR bundle and formats it into structured data for display.
 * @param fhirBundle - The FHIR bundle containing provider data.
 * @param mappings - The object containing the fhir paths.
 * @returns An array of evaluated and formatted provider data.
 */
export const evaluateProviderData = (
  fhirBundle: Bundle,
  mappings: PathMappings,
) => {
  const encounterRef: string | undefined = evaluate(
    fhirBundle,
    mappings["compositionEncounterRef"],
  )[0];
  const encounter: Encounter = evaluateReference(
    fhirBundle,
    mappings,
    encounterRef ?? "",
  );
  const encounterParticipantRef: string | undefined = evaluate(
    encounter,
    mappings["encounterIndividualRef"],
  )[0];
  const { practitioner, organization } = evaluatePractitionerRoleReference(
    fhirBundle,
    mappings,
    encounterParticipantRef ?? "",
  );

  const providerData = [
    {
      title: "Provider Name",
      value: formatName(practitioner?.name?.[0]),
    },
    {
      title: "Provider Address",
      value: practitioner?.address?.map((address) => formatAddress(address)),
    },
    {
      title: "Provider Contact",
      value: formatContactPoint(practitioner?.telecom),
    },
    {
      title: "Provider Facility Name",
      value: organization?.name,
    },
    {
      title: "Provider Facility Address",
      value: organization?.address?.map((address) => formatAddress(address)),
    },
    {
      title: "Provider ID",
      value: practitioner?.identifier?.map((id) => id.value).join("\n"),
    },
  ];

  return evaluateData(providerData);
};

/**
 * Evaluates provider data from the FHIR bundle and formats it into structured data for display.
 * @param fhirBundle - The FHIR bundle containing provider data.
 * @param mappings - The object containing the fhir paths.
 * @returns An array of evaluated and formatted provider data.
 */
export const evaluateEncounterCareTeamTable = (
  fhirBundle: Bundle,
  mappings: PathMappings,
) => {
  const encounterRef: string | undefined = evaluate(
    fhirBundle,
    mappings["compositionEncounterRef"],
  )[0];
  const encounter: Encounter = evaluateReference(
    fhirBundle,
    mappings,
    encounterRef ?? "",
  );
  const participants = evaluate(encounter, mappings["encounterParticipants"]);

  const tables = participants.map((participant) => {
    const role = evaluateValue(participant, "type");
    const { start, end } = evaluate(participant, "period")?.[0] ?? {};
    const { practitioner } = evaluatePractitionerRoleReference(
      fhirBundle,
      mappings,
      participant.individual.reference,
    );

    return {
      Name: {
        value: formatName(practitioner?.name?.[0]) || noData,
      },
      Role: {
        value: role || noData,
      },
      Dates: {
        value: formatStartEndDate(start, end) || noData,
      },
    } as TableRow;
  });

  return returnTableFromJson(
    { resultName: "Encounter Care Team", tables: [tables] },
    true,
    "caption-data-title margin-y-0",
  );
};

/**
 * Evaluates emergency contact information from the FHIR bundle and formats it into a readable string.
 * @param fhirBundle - The FHIR bundle containing patient information.
 * @param mappings - The object containing the fhir paths.
 * @returns The formatted emergency contact information.
 */
export const evaluateEmergencyContact = (
  fhirBundle: Bundle,
  mappings: PathMappings,
) => {
  const contacts: PatientContact[] =
    evaluate(fhirBundle, mappings.patientEmergencyContact) ?? [];

  if (contacts.length === 0) return undefined;

  return contacts
    .map((contact) => {
      const relationship = toSentenceCase(
        contact.relationship?.[0].coding?.[0]?.display,
      );

      const contactName = contact.name ? formatName(contact.name) : "";

      const address = contact.address ? formatAddress(contact.address) : "";

      const phoneNumbers = formatContactPoint(contact.telecom);

      return [relationship, contactName, address, phoneNumbers]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
};

/**
 * Evaluates a reference in a FHIR bundle.
 * @param fhirBundle - The FHIR bundle containing resources.
 * @param mappings - Path mappings for resolving references.
 * @param ref - The reference string (e.g., "Patient/123").
 * @returns The FHIR Resource or undefined if not found.
 */
export const evaluateReference = (
  fhirBundle: Bundle,
  mappings: PathMappings,
  ref: string,
) => {
  const [resourceType, id] = ref.split("/");
  return evaluate(fhirBundle, mappings.resolve, {
    resourceType,
    id,
  })[0];
};

/**
 * Evaluates the FHIR path and returns the appropriate string value. Supports choice elements (e.g. using `.value` in path to get valueString or valueCoding)
 * @param entry - The FHIR resource to evaluate.
 * @param path - The path within the resource to extract the value from.
 * @returns - The evaluated value as a string.
 */
export const evaluateValue = (
  entry: Element | Element[],
  path: string | Path,
): string => {
  let originalValue = evaluate(entry, path, undefined, fhirpath_r4_model)[0];

  let value = "";
  const originalValuePath = originalValue?.__path__?.path;
  if (
    typeof originalValue === "string" ||
    typeof originalValue === "number" ||
    typeof originalValue === "boolean"
  ) {
    value = originalValue.toString();
  } else if (originalValuePath === "Quantity") {
    const data: Quantity = originalValue;
    let unit = data.unit;
    const firstLetterRegex = /^[a-z]/i;
    if (unit?.match(firstLetterRegex)) {
      unit = " " + unit;
    }
    value = `${data.value ?? ""}${unit ?? ""}`;
  } else if (originalValuePath === "CodeableConcept") {
    const data: CodeableConcept = originalValue;
    value =
      data.coding?.[0].display || data.text || data.coding?.[0].code || "";
  } else if (originalValuePath === "Coding") {
    const data: Coding = originalValue;
    value = data?.display || data?.code || "";
  } else if (typeof originalValue === "object") {
    console.log(`Not implemented for ${originalValue.__path__}`);
  }

  return value.trim();
};

/**
 * Find facility ID based on the first encounter's location
 * @param fhirBundle - The FHIR bundle containing resources.
 * @param mappings - Path mappings for resolving references.
 * @returns Facility id
 */
export const evaluateFacilityId = (
  fhirBundle: Bundle,
  mappings: PathMappings,
) => {
  const encounterLocationRef =
    evaluate(fhirBundle, mappings.facilityLocation)?.[0] ?? "";
  const location: Location = evaluateReference(
    fhirBundle,
    mappings,
    encounterLocationRef,
  );

  return location?.identifier?.[0].value;
};

/**
 * Evaluate practitioner role reference
 * @param fhirBundle - The FHIR bundle containing resources.
 * @param mappings - Path mappings for resolving references.
 * @param practitionerRoleRef - practitioner role reference to be searched.
 * @returns practitioner and organization
 */
export const evaluatePractitionerRoleReference = (
  fhirBundle: Bundle,
  mappings: PathMappings,
  practitionerRoleRef: string,
): { practitioner?: Practitioner; organization?: Organization } => {
  const practitionerRole: PractitionerRole | undefined = evaluateReference(
    fhirBundle,
    mappings,
    practitionerRoleRef,
  );
  const practitioner: Practitioner | undefined = evaluateReference(
    fhirBundle,
    mappings,
    practitionerRole?.practitioner?.reference ?? "",
  );
  const organization: Organization | undefined = evaluateReference(
    fhirBundle,
    mappings,
    practitionerRole?.organization?.reference ?? "",
  );
  return { practitioner, organization };
};

/**
 * Find encounter diagnoses
 * @param fhirBundle - The FHIR bundle containing resources.
 * @param mappings - Path mappings for resolving references.
 * @returns Comma delimited list of encounter diagnoses
 */
export const evaluateEncounterDiagnosis = (
  fhirBundle: Bundle,
  mappings: PathMappings,
) => {
  const encounterDiagnosisRefs = evaluate(
    fhirBundle,
    mappings.encounterDiagnosis,
  );

  const conditions: Condition[] = encounterDiagnosisRefs.map((diagnosis) =>
    evaluateReference(fhirBundle, mappings, diagnosis.condition.reference),
  );

  return conditions
    .map((condition) => condition.code?.coding?.[0].display)
    .join(", ");
};

/**
 * Evaluate patient's prefered language
 * @param fhirBundle - The FHIR bundle containing resources.
 * @param mappings - Path mappings for resolving references.
 * @returns String containing language, proficiency, and mode
 */
export const evaluatePatientLanguage = (
  fhirBundle: Bundle,
  mappings: PathMappings,
) => {
  let patientCommunication: PatientCommunication[] = evaluate(
    fhirBundle,
    mappings.patientCommunication,
  );
  const preferedPatientCommunication = patientCommunication.filter(
    (communication) => communication.preferred,
  );

  if (preferedPatientCommunication.length > 0) {
    patientCommunication = preferedPatientCommunication;
  }

  return patientCommunication
    .map((communication) => {
      const patientProficiencyExtension: Extension[] = evaluate(
        communication,
        "extension.where(url = 'http://hl7.org/fhir/StructureDefinition/patient-proficiency')",
      );
      const patientLanguage: string | undefined = evaluateValue(
        communication,
        "language.coding",
      );
      const languageProficency: string | undefined = evaluateValue(
        patientProficiencyExtension,
        "extension.where(url = 'level').value",
      );
      const languageMode: string | undefined = evaluateValue(
        patientProficiencyExtension,
        "extension.where(url = 'type').value",
      );

      return [patientLanguage, languageProficency, languageMode]
        .filter(Boolean)
        .join("\n");
    })
    .filter(Boolean)
    .join("\n\n");
};
