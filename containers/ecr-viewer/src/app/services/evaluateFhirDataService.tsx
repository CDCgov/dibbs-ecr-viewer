import "server-only"; // FHIR evaluation should be done server side

import * as dateFns from "date-fns";
import {
  Address,
  Bundle,
  CodeableConcept,
  Coding,
  Condition,
  Element,
  Encounter,
  EncounterDiagnosis,
  EncounterParticipant,
  Extension,
  HumanName,
  Identifier,
  Location,
  Organization,
  PatientCommunication,
  PatientContact,
  Practitioner,
  PractitionerRole,
  Quantity,
  Reference,
  Resource,
} from "fhir/r4";
import { Path } from "fhirpath";
import fhirpath_r4_model from "fhirpath/fhir-context/r4";

import { evaluateData, noData } from "@/app/utils/data-utils";
import { evaluate } from "@/app/utils/evaluate";
import { toSentenceCase, toTitleCase } from "@/app/utils/format-utils";
import { DisplayDataProps } from "@/app/view-data/components/DataDisplay";
import { JsonTable } from "@/app/view-data/components/JsonTable";
import fhirPathMappings from "@/app/view-data/fhirPath";

import {
  formatDate,
  formatStartEndDate,
  formatStartEndDateTime,
} from "./formatDateService";
import {
  formatAddress,
  formatContactPoint,
  formatName,
  formatPhoneNumber,
} from "./formatService";
import { HtmlTableJsonRow } from "./htmlTableService";
import { evaluateTravelHistoryTable } from "./socialHistoryService";

/**
 * Evaluates patient name from the FHIR bundle and formats it into structured data for display.
 * @param fhirBundle - The FHIR bundle containing patient contact info.
 * @param isPatientBanner - Whether to format the name for the Patient banner
 * @returns The formatted patient name
 */
export const evaluatePatientName = (
  fhirBundle: Bundle,
  isPatientBanner: boolean,
) => {
  const nameList: HumanName[] = evaluate(
    fhirBundle,
    fhirPathMappings.patientNameList,
  );

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
 * @returns - The patient's race information, including race OMB category and detailed extension (if available).
 */
export const evaluatePatientRace = (fhirBundle: Bundle) => {
  const raceCat: string = evaluateValue(
    fhirBundle,
    fhirPathMappings.patientRace,
  );
  const raceDetailed: string = evaluateValue(
    fhirBundle,
    fhirPathMappings.patientRaceDetailed,
  );

  return [raceCat, raceDetailed].filter(Boolean).join("\n");
};

/**
 * Evaluates the patients ethnicity from the FHIR bundle and formats for display.
 * @param fhirBundle - The FHIR bundle containing patient contact info.
 * @returns - The patient's ethnicity information, including additional ethnicity extension (if available).
 */
export const evaluatePatientEthnicity = (fhirBundle: Bundle) => {
  const ethnicity: string = evaluateValue(
    fhirBundle,
    fhirPathMappings.patientEthnicity,
  );
  const ethnicityDetailed = evaluateValue(
    fhirBundle,
    fhirPathMappings.patientEthnicityDetailed,
  );

  return [ethnicity, ethnicityDetailed].filter(Boolean).join("\n");
};

/**
 * Evaluates patient address from the FHIR bundle and formats it into structured data for display.
 * @param fhirBundle - The FHIR bundle containing patient contact info.
 * @returns The formatted patient address
 */
export const evaluatePatientAddress = (fhirBundle: Bundle) => {
  const addresses: Address[] = evaluate(
    fhirBundle,
    fhirPathMappings.patientAddressList,
  );

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
 * @returns Encounter ID or empty string if not available.
 */
export const evaluateEncounterId = (fhirBundle: Bundle) => {
  const encounterIDs: Identifier[] = evaluate(
    fhirBundle,
    fhirPathMappings.encounterID,
  );
  const filteredIds = encounterIDs
    .filter((id) => typeof id.value === "string" && /^\d+$/.test(id.value))
    .map((id) => id.value);

  return filteredIds[0] ?? "";
};

/**
 * Gets the formatted patient Date of Birth.
 * @param fhirBundle - The FHIR bundle containing patient information.
 * @returns - The formatted patient DOB.
 */
export const evaluatePatientDOB = (fhirBundle: Bundle) =>
  formatDate(
    (evaluate(fhirBundle, fhirPathMappings.patientDOB) as string[])[0],
  );

/**
 * Calculates the age of a patient to a given date or today, unless DOD exists.
 * @param fhirBundle - The FHIR bundle containing patient information.
 * @param [givenDate] - Optional. The target date to calculate the age. Defaults to the current date if not provided.
 * @returns - The age of the patient in years, or undefined if date of birth is not available or if date of death exists.
 */
export const calculatePatientAge = (fhirBundle: Bundle, givenDate?: string) => {
  const patientDOBString: string = evaluate(
    fhirBundle,
    fhirPathMappings.patientDOB,
  )[0];
  const patientDODString: string = evaluate(
    fhirBundle,
    fhirPathMappings.patientDOD,
  )[0];
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
 * @returns - The age of the patient at death in years, or undefined if date of birth or date of death is not available.
 */
export const calculatePatientAgeAtDeath = (fhirBundle: Bundle) => {
  const patientDOBString: string = evaluate(
    fhirBundle,
    fhirPathMappings.patientDOB,
  )[0];
  const patientDODString: string = evaluate(
    fhirBundle,
    fhirPathMappings.patientDOD,
  )[0];

  if (patientDOBString && patientDODString) {
    const patientDOB = new Date(patientDOBString);
    const patientDOD = new Date(patientDODString);
    return dateFns.differenceInYears(patientDOD, patientDOB);
  } else {
    return undefined;
  }
};

/**
 * Evaluates patient's vital status from the FHIR bundle and formats it into structured data for display.
 * @param fhirBundle The FHIR bundle containing the patient's vital status
 * @returns The vital status of the patient, either `Alive`, `Deceased`, or `""` (if not found)
 */
export const evaluatePatientVitalStatus = (fhirBundle: Bundle) => {
  const patientVitalStatus: boolean[] = evaluate(
    fhirBundle,
    fhirPathMappings.patientVitalStatus,
  );

  if (!patientVitalStatus.length) {
    return "";
  }

  const isPatientDeceased = patientVitalStatus[0];

  return isPatientDeceased ? "Deceased" : "Alive";
};

/**
 * Evaluates alcohol use information from the FHIR bundle and formats it into structured data for display.
 * @param fhirBundle - The FHIR bundle containing alcohol use data.
 * @returns An array of evaluated and formatted alcohol use data.
 */
export const evaluateAlcoholUse = (fhirBundle: Bundle) => {
  const alcoholUse = evaluateValue(
    fhirBundle,
    fhirPathMappings.patientAlcoholUse,
  );
  const alcoholIntake = evaluateValue(
    fhirBundle,
    fhirPathMappings.patientAlcoholIntake,
  );
  let alcoholComment: string | undefined = evaluateValue(
    fhirBundle,
    fhirPathMappings.patientAlcoholComment,
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
 * @returns An array of evaluated and formatted social data.
 */
export const evaluateSocialData = (fhirBundle: Bundle) => {
  const socialData: DisplayDataProps[] = [
    {
      title: "Tobacco Use",
      value: evaluateValue(fhirBundle, fhirPathMappings.patientTobaccoUse),
    },
    {
      title: "Travel History",
      value: evaluateTravelHistoryTable(fhirBundle),
      table: true,
    },
    {
      title: "Homeless Status",
      value: evaluateValue(fhirBundle, fhirPathMappings.patientHomelessStatus),
    },
    {
      title: "Pregnancy Status",
      value: evaluateValue(fhirBundle, fhirPathMappings.patientPregnancyStatus),
    },
    {
      title: "Alcohol Use",
      value: evaluateAlcoholUse(fhirBundle),
    },
    {
      title: "Sexual Orientation",
      value: evaluateValue(
        fhirBundle,
        fhirPathMappings.patientSexualOrientation,
      ),
    },
    {
      title: "Occupation",
      value: evaluateValue(fhirBundle, fhirPathMappings.patientCurrentJobTitle),
    },
    {
      title: "Religious Affiliation",
      value: evaluateValue(fhirBundle, fhirPathMappings.patientReligion),
    },
    {
      title: "Marital Status",
      value: evaluateValue(fhirBundle, fhirPathMappings.patientMaritalStatus),
    },
  ];
  return evaluateData(socialData);
};

/**
 * Evaluates demographic data from the FHIR bundle and formats it into structured data for display.
 * @param fhirBundle - The FHIR bundle containing demographic data.
 * @returns An array of evaluated and formatted demographic data.
 */
export const evaluateDemographicsData = (fhirBundle: Bundle) => {
  const patientSex = toTitleCase(
    evaluate(fhirBundle, fhirPathMappings.patientGender)[0],
  );

  const demographicsData: DisplayDataProps[] = [
    {
      title: "Patient Name",
      value: evaluatePatientName(fhirBundle, false),
    },
    {
      title: "DOB",
      value: evaluatePatientDOB(fhirBundle),
    },
    {
      title: "Current Age",
      value: calculatePatientAge(fhirBundle)?.toString(),
    },
    {
      title: "Age at Death",
      value: calculatePatientAgeAtDeath(fhirBundle),
    },
    {
      title: "Vital Status",
      value: evaluatePatientVitalStatus(fhirBundle),
    },
    {
      title: "Date of Death",
      value: evaluate(fhirBundle, fhirPathMappings.patientDOD)[0],
    },
    {
      title: "Sex",
      // Unknown and Other sex options removed to be in compliance with Executive Order 14168
      value: censorGender(patientSex),
    },
    {
      title: "Race",
      value: evaluatePatientRace(fhirBundle),
    },
    {
      title: "Ethnicity",
      value: evaluatePatientEthnicity(fhirBundle),
    },
    {
      title: "Tribal Affiliation",
      value: evaluateValue(
        fhirBundle,
        fhirPathMappings.patientTribalAffiliation,
      ),
    },
    {
      title: "Preferred Language",
      value: evaluatePatientLanguage(fhirBundle),
    },
    {
      title: "Patient Address",
      value: evaluatePatientAddress(fhirBundle),
    },
    {
      title: "County",
      value: evaluate(fhirBundle, fhirPathMappings.patientCounty)[0],
    },
    {
      title: "Country",
      value: evaluate(fhirBundle, fhirPathMappings.patientCountry)[0],
    },
    {
      title: "Contact",
      value: formatContactPoint(
        evaluate(fhirBundle, fhirPathMappings.patientTelecom),
      ),
    },
    {
      title: "Emergency Contact",
      value: evaluateEmergencyContact(fhirBundle),
    },
    {
      title: "Patient IDs",
      toolTip:
        "Unique patient identifier(s) from their medical record. For example, a patient's social security number or medical record number.",
      value: evaluateValue(fhirBundle, fhirPathMappings.patientIds),
    },
  ];
  return evaluateData(demographicsData);
};

/**
 * Evaluates encounter data from the FHIR bundle and formats it into structured data for display.
 * @param fhirBundle - The FHIR bundle containing encounter data.
 * @returns An array of evaluated and formatted encounter data.
 */
export const evaluateEncounterData = (fhirBundle: Bundle) => {
  const encounterData = [
    {
      title: "Encounter Date/Time",
      value: formatStartEndDateTime(
        evaluate(fhirBundle, fhirPathMappings.encounterStartDate)[0],
        evaluate(fhirBundle, fhirPathMappings.encounterEndDate)[0],
      ),
    },
    {
      title: "Encounter Type",
      value: evaluate(fhirBundle, fhirPathMappings.encounterType)[0],
    },
    {
      title: "Encounter ID",
      value: evaluateEncounterId(fhirBundle),
    },
    {
      title: "Encounter Diagnosis",
      value: evaluateEncounterDiagnosis(fhirBundle),
    },
    {
      title: "Encounter Care Team",
      value: evaluateEncounterCareTeamTable(fhirBundle),
      table: true,
    },
  ];
  return evaluateData(encounterData);
};

/**
 * Evaluates facility data from the FHIR bundle and formats it into structured data for display.
 * @param fhirBundle - The FHIR bundle containing facility data.
 * @returns An array of evaluated and formatted facility data.
 */
export const evaluateFacilityData = (fhirBundle: Bundle) => {
  const facilityContactAddressRef: Reference[] = evaluate(
    fhirBundle,
    fhirPathMappings.facilityContactAddress,
  );
  let referenceString;

  if (facilityContactAddressRef[0]) {
    referenceString = facilityContactAddressRef[0].reference;
  }
  const facilityContactAddress: Address | undefined =
    evaluateReference<Organization>(fhirBundle, referenceString)?.address?.[0];

  const facilityData = [
    {
      title: "Facility Name",
      value: evaluate(fhirBundle, fhirPathMappings.facilityName)[0],
    },
    {
      title: "Facility Address",
      value: formatAddress(
        evaluate(fhirBundle, fhirPathMappings.facilityAddress)[0],
      ),
    },
    {
      title: "Facility Contact Address",
      value: formatAddress(facilityContactAddress),
    },
    {
      title: "Facility Contact",
      value: formatPhoneNumber(
        evaluate(fhirBundle, fhirPathMappings.facilityContact)[0],
      ),
    },
    {
      title: "Facility Type",
      value: evaluateValue(fhirBundle, fhirPathMappings.facilityType),
    },
    {
      title: "Facility ID",
      value: evaluateFacilityId(fhirBundle),
    },
  ];
  return evaluateData(facilityData);
};

/**
 * Evaluates provider data from the FHIR bundle and formats it into structured data for display.
 * @param fhirBundle - The FHIR bundle containing provider data.
 * @returns An array of evaluated and formatted provider data.
 */
export const evaluateProviderData = (fhirBundle: Bundle) => {
  const encounterRef: string | undefined = evaluate(
    fhirBundle,
    fhirPathMappings.compositionEncounterRef,
  )[0];

  const encounter = evaluateReference<Encounter>(fhirBundle, encounterRef);
  const encounterParticipantRef: string | undefined = evaluate(
    encounter,
    fhirPathMappings.encounterIndividualRef,
  )[0];
  const { practitioner, organization } = evaluatePractitionerRoleReference(
    fhirBundle,
    encounterParticipantRef,
  );

  const providerData: DisplayDataProps[] = [
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
 * @returns An array of evaluated and formatted provider data.
 */
export const evaluateEncounterCareTeamTable = (fhirBundle: Bundle) => {
  const encounterRef: string | undefined = evaluate(
    fhirBundle,
    fhirPathMappings.compositionEncounterRef,
  )[0];
  const encounter = evaluateReference<Encounter>(fhirBundle, encounterRef);
  const participants: EncounterParticipant[] = evaluate(
    encounter,
    fhirPathMappings.encounterParticipants,
  );

  const tables = participants.map((participant) => {
    const role = evaluateValue(participant, "type");
    const { start, end } = evaluate(participant, "period")?.[0] ?? {};
    const participantRef = participant.individual?.reference;

    const { practitioner } = evaluatePractitionerRoleReference(
      fhirBundle,
      participantRef,
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
    } as HtmlTableJsonRow;
  });

  if (!tables.length) return undefined;

  return (
    <JsonTable
      jsonTableData={{ resultName: "Encounter Care Team", tables: [tables] }}
      className="caption-data-title margin-y-0"
    />
  );
};

/**
 * Evaluates emergency contact information from the FHIR bundle and formats it into a readable string.
 * @param fhirBundle - The FHIR bundle containing patient information.
 * @returns The formatted emergency contact information.
 */
export const evaluateEmergencyContact = (fhirBundle: Bundle) => {
  const contacts: PatientContact[] =
    evaluate(fhirBundle, fhirPathMappings.patientEmergencyContact) ?? [];

  if (contacts.length === 0) return undefined;

  return contacts
    .map((contact) => {
      const relationship = toSentenceCase(
        getHumanReadableCodeableConcept(contact.relationship?.[0]),
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
 * @param ref - The reference string (e.g., "Patient/123").
 * @returns The FHIR Resource or undefined if not found.
 */
export const evaluateReference = <T extends Resource>(
  fhirBundle: Bundle,
  ref?: string,
): T | undefined => {
  if (!ref) return undefined;
  const [resourceType, id] = ref.split("/");
  const result: Resource | undefined = evaluate(
    fhirBundle,
    fhirPathMappings.resolve,
    {
      resourceType,
      id,
    },
  )[0];

  if (!result) {
    return undefined;
  } else if (result?.resourceType !== resourceType) {
    console.error(
      `Resource type mismatch: Expected ${resourceType}, but got ${result?.resourceType}`,
    );
  }

  return result as T;
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
  const originalValue = evaluate(entry, path, undefined, fhirpath_r4_model)[0];

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
    value = getHumanReadableCodeableConcept(data) ?? "";
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
 * @returns Facility id
 */
export const evaluateFacilityId = (fhirBundle: Bundle) => {
  const encounterLocationRef =
    evaluate(fhirBundle, fhirPathMappings.facilityLocation)?.[0] ?? "";
  const location = evaluateReference<Location>(
    fhirBundle,
    encounterLocationRef,
  );

  return location?.identifier?.[0].value;
};

/**
 * Evaluate practitioner role reference
 * @param fhirBundle - The FHIR bundle containing resources.
 * @param practitionerRoleRef - practitioner role reference to be searched.
 * @returns practitioner and organization
 */
export const evaluatePractitionerRoleReference = (
  fhirBundle: Bundle,
  practitionerRoleRef?: string,
): { practitioner?: Practitioner; organization?: Organization } => {
  if (!practitionerRoleRef) return {};

  const practitionerRole = evaluateReference<PractitionerRole>(
    fhirBundle,
    practitionerRoleRef,
  );
  const practitioner = evaluateReference<Practitioner>(
    fhirBundle,
    practitionerRole?.practitioner?.reference,
  );
  const organization = evaluateReference<Organization>(
    fhirBundle,
    practitionerRole?.organization?.reference,
  );

  return { practitioner, organization };
};

/**
 * Find encounter diagnoses
 * @param fhirBundle - The FHIR bundle containing resources.
 * @returns Comma delimited list of encounter diagnoses
 */
export const evaluateEncounterDiagnosis = (fhirBundle: Bundle) => {
  const diagnoses: EncounterDiagnosis[] = evaluate(
    fhirBundle,
    fhirPathMappings.encounterDiagnosis,
  );

  return diagnoses
    .map((diagnosis) => {
      const reference = diagnosis.condition?.reference;
      const condition = evaluateReference<Condition>(fhirBundle, reference);
      return getHumanReadableCodeableConcept(condition?.code);
    })
    .filter(Boolean)
    .join(", ");
};

/**
 * Evaluate patient's prefered language
 * @param fhirBundle - The FHIR bundle containing resources.
 * @returns String containing language, proficiency, and mode
 */
export const evaluatePatientLanguage = (fhirBundle: Bundle) => {
  let patientCommunication: PatientCommunication[] = evaluate(
    fhirBundle,
    fhirPathMappings.patientCommunication,
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

/**
 * Attempts to return a human-readable display value for a CodeableConcept. It will return the first
 * available value in the following order:
 * 1) `undefined` if the `CodeableConcept` is falsy
 * 2) `CodeableConcept.text`
 * 3) value of the first `coding` with a `display` value
 * 4) `code` and `system` values of the first `coding` with a `code` and `system values.
 * 5) `code` of the first `coding` with a `code` value
 * 6) `undefined`
 * @param codeableConcept - The CodeableConcept to get the display value from.
 * @returns - The human-readable display value of the CodeableConcept.
 */
export const getHumanReadableCodeableConcept = (
  codeableConcept: CodeableConcept | undefined,
) => {
  if (!codeableConcept) {
    return undefined;
  }

  const { coding, text } = codeableConcept;

  if (text) {
    return text;
  }

  const firstCodingWithDisplay = coding?.find((c) => c.display);
  if (firstCodingWithDisplay?.display) {
    return firstCodingWithDisplay.display;
  }

  const firstCodingWithCodeSystem = coding?.find((c) => c.code && c.system);
  if (firstCodingWithCodeSystem?.code && firstCodingWithCodeSystem?.system) {
    return `${firstCodingWithCodeSystem.code} (${firstCodingWithCodeSystem.system})`;
  }

  const firstCodingWithCode = coding?.find((c) => c.code);
  if (firstCodingWithCode?.code) {
    return firstCodingWithCode.code;
  }

  return undefined;
};

/**
 * Censors "Unknown" and "Other" gender options for the given string in compliance with Executive Order 14168
 * @param gender - Gender string
 * @returns - if  the string is "Male" or "Female" it returns the string, otherwise it returns an empty string
 */
export const censorGender = (gender: string | undefined) => {
  return gender && ["Male", "Female"].includes(gender) ? gender : "";
};
