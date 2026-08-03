import "server-only"; // FHIR evaluation should be done server side

import { Bundle, Encounter, Patient, RelatedPerson } from "fhir/r4";
import { DateTime } from "luxon";

import { formatDate, formatDateTime } from "@/app/services/formatDateService";
import {
  formatAddressList,
  formatContactPoint,
  formatName,
  formatNameList,
  formatPatientContactList,
  formatAge,
  findCurrentAddress,
  Age,
} from "@/app/services/formatService";
import { evaluateData } from "@/app/utils/data-utils";
import {
  evaluateAll,
  evaluateOne,
  evaluateOneReference,
  evaluateValue,
} from "@/app/utils/evaluate";
import fhirPathMappings from "@/app/utils/evaluate/fhir-paths";
import { toTitleCase } from "@/app/utils/format-utils";
import { DisplayDataProps } from "@/app/view-data/components/DataDisplay";
import {
  FhirIndex,
  getOneResourceByType,
  getResourcesByType,
} from "./fhirResourcesIndexService";

// =============================================================================
// Patient Info: Demographics
// =============================================================================

/**
 * Finds patient resource from FHIR bundle
 * @param fhirIndex - FHIR resources indexed by tpe & by ID
 * @returns Patient resource if it exists, or undefined if not
 */
export const getPatient = (fhirIndex: FhirIndex): Patient | undefined => {
  return getOneResourceByType<Patient>(fhirIndex, "Patient");
};

/**
 * Evaluates patient name from the FHIR bundle and formats it into structured data for display.
 * @param fhirBundle - The FHIR bundle containing patient contact info.
 * @param isPatientBanner - Whether to format the name for the Patient banner
 * @returns The formatted patient name
 */
export const evaluatePatientName = (
  patient: Patient | undefined,
  isPatientBanner: boolean,
) => {
  const nameList = evaluateAll(patient, fhirPathMappings.patientNameList);

  // Return early if there's no name
  if (nameList.length === 0) {
    return;
  }

  if (isPatientBanner) {
    const officialName = nameList.find((n) => n.use === "official");
    return formatName(officialName ?? nameList[0]);
  }

  return formatNameList(nameList);
};

/**
 * Gets the formatted patient Date of Birth.
 * @param fhirBundle - The FHIR bundle containing patient information.
 * @returns - The formatted patient DOB.
 */
export const evaluatePatientDOB = (patient: Patient | undefined) =>
  formatDate(evaluateOne(patient, fhirPathMappings.patientDOB));

/**
 * Calculates the patient's age at a specific point in time or the current date.
 * @param fhirBundle - The FHIR bundle containing patient information.
 * @param [givenDate] - Optional date to calculate age at.
 * @returns The patient's age in years, or undefined if patient has no birth date.
 */
export const calculatePatientAge = (
  patient: Patient | undefined,
  givenDate?: string,
): Age | undefined => {
  const patientDOBString = evaluateOne(patient, fhirPathMappings.patientDOB);

  // If no patient DOB is available, return undefined.
  if (!patientDOBString) {
    return undefined;
  }

  const patientDOB = DateTime.fromJSDate(new Date(patientDOBString));

  // If date is provided by caller, use that.
  if (givenDate) {
    return calculateAge(DateTime.fromJSDate(new Date(givenDate)), patientDOB);
  }

  // Default to current date if no encounter date is available
  return calculateAge(DateTime.now(), patientDOB);
};

/**
 * Helper function to calculate an age given two `DateTimes`
 * @param laterDate DateTime later in time
 * @param earlierDate DateTime earlier in time
 * @returns An `Age`
 */
const calculateAge = (laterDate: DateTime, earlierDate: DateTime): Age => {
  const { years, months, days } = laterDate
    .diff(earlierDate, ["years", "months", "days"])
    .toObject();

  return {
    years: years ?? 0,
    months: months ?? 0,
    days: Math.round(days ?? 0),
  };
};

/**
 * Creates a DisplayDataProps object for patient age data based on the following:
 * 1) If the patient has a death date, it returns an empty object.
 * 2) If the encounter has a start date, it calculates the age at that date.
 * 3) If the encounter has an end date and it is in the past, it calculates the age at that end date.
 * 4) If there are no encounter dates, it calculates the age when eCr was created, as a proxy for encounter date.
 * @param fhirBundle - The FHIR bundle containing patient data.
 * @returns A DisplayDataProps object with title, tooltip, and value for patient age.
 */
export const createPatientAgeDataProp = (
  fhirBundle: Bundle,
  patient: Patient | undefined,
): DisplayDataProps => {
  const encounter = evaluateOneReference<Encounter>(
    fhirBundle,
    fhirPathMappings.compositionEncounterRef,
  );
  const patientDOBString = evaluateOne(patient, fhirPathMappings.patientDOB);

  let title = "Age at Encounter";
  let toolTip;
  let value;

  // If patient has death date, return empty object
  if (isPatientDeceased(patient)) {
    title = "Age at Death";
    const patientDODString = evaluateOne(patient, fhirPathMappings.patientDOD);
    if (patientDOBString && patientDODString) {
      value = formatAge(calculatePatientAge(patient, patientDODString));
    }

    return {
      title,
      value,
      toolTip,
    };
  }

  // Handle encounter start date
  if (encounter?.period?.start) {
    value = formatAge(calculatePatientAge(patient, encounter.period.start));
    return { title, toolTip, value };
  }

  // Handle encounter end date
  if (encounter?.period?.end) {
    const encounterEnd = DateTime.fromJSDate(new Date(encounter.period.end));

    if (encounterEnd <= DateTime.now()) {
      toolTip =
        "Age at end date of encounter. Start date of encounter is not available.";
      value = formatAge(calculatePatientAge(patient, encounter.period.end));
    } else {
      value = formatAge(
        calculatePatientAge(
          patient,
          evaluateOne(fhirBundle, fhirPathMappings.dateTimeEcrCreated),
        ),
      );
      if (value) {
        toolTip =
          "Using the date eCR was created as a proxy for date of encounter. No encounter start date and encounter end date is in the future.";
      }
    }
    return { title, toolTip, value };
  }

  // Handle no encounter dates
  value = formatAge(
    calculatePatientAge(
      patient,
      evaluateOne(fhirBundle, fhirPathMappings.dateTimeEcrCreated),
    ),
  );
  if (value) {
    toolTip =
      "Using the date eCR was created as a proxy for date of encounter. No encounter date available.";
  }

  return { title, toolTip, value };
};

/**
 * Evaluates patient's vital status from the FHIR bundle and formats it into structured data for display.
 * @param fhirBundle The FHIR bundle containing the patient's vital status
 * @returns The vital status of the patient, either `Alive`, `Deceased`, or `""` (if not found)
 */
export const evaluatePatientVitalStatus = (patient: Patient | undefined) => {
  const isDeceased = isPatientDeceased(patient);
  if (isDeceased === undefined) {
    return "";
  } else {
    return isDeceased === true ? "Deceased" : "Alive";
  }
};

/***
 * A patient is deceased if `patient.deceasedBoolean` is true or if there is a date/time of death. If both are `undefined`
 * return `undefined`.
 */
const isPatientDeceased = (patient: Patient | undefined) => {
  const vitalStatus = evaluateOne(patient, fhirPathMappings.patientVitalStatus);
  const dod = evaluateOne(patient, fhirPathMappings.patientDOD);

  return dod ? true : vitalStatus;
};

/**
 * Censors "Unknown" and "Other" gender options for the given string in compliance with Executive Order 14168
 * @param gender - Gender string
 * @returns - if  the string is "Male" or "Female" it returns the string, otherwise it returns an empty string
 */
export const censorGender = (gender: string | undefined) => {
  return gender && ["Male", "Female"].includes(gender) ? gender : "";
};

/**
 * Evaluates the patient's race from the FHIR bundle and formats for display.
 * @param fhirBundle - The FHIR bundle containing patient contact info.
 * @returns - The patient's race information, including race OMB category and detailed extension (if available).
 */
export const evaluatePatientRace = (patient: Patient | undefined) => {
  const raceCat: string = evaluateValue(patient, fhirPathMappings.patientRace);
  const raceDetailed: string = evaluateValue(
    patient,
    fhirPathMappings.patientRaceDetailed,
  );

  return [raceCat, raceDetailed].filter(Boolean).join("\n");
};

/**
 * Evaluates the patients ethnicity from the FHIR bundle and formats for display.
 * @param fhirBundle - The FHIR bundle containing patient contact info.
 * @returns - The patient's ethnicity information, including additional ethnicity extension (if available).
 */
export const evaluatePatientEthnicity = (patient: Patient | undefined) => {
  const ethnicity: string = evaluateValue(
    patient,
    fhirPathMappings.patientEthnicity,
  );
  const ethnicityDetailed = evaluateValue(
    patient,
    fhirPathMappings.patientEthnicityDetailed,
  );

  return [ethnicity, ethnicityDetailed].filter(Boolean).join("\n");
};

/**
 * Evaluate patient's preferred language
 * @param fhirBundle - The FHIR bundle containing resources.
 * @returns String containing language, proficiency, and mode
 */
export const evaluatePatientLanguage = (patient: Patient | undefined) => {
  let patientCommunication = evaluateAll(
    patient,
    fhirPathMappings.patientCommunication,
  );
  const preferredPatientCommunication = patientCommunication.filter(
    (communication) => communication.preferred,
  );

  if (preferredPatientCommunication.length > 0) {
    patientCommunication = preferredPatientCommunication;
  }

  return patientCommunication
    .map((communication) => {
      const patientLanguage = evaluateValue(communication, "language.coding");

      const patientProficiencyExtension = evaluateAll(
        communication,
        fhirPathMappings.patientProficiencyExtension,
      );
      const languageProficiency = evaluateValue(
        patientProficiencyExtension,
        "extension.where(url = 'level').value",
      );
      const languageMode = evaluateValue(
        patientProficiencyExtension,
        "extension.where(url = 'type').value",
      );

      return [patientLanguage, languageProficiency, languageMode]
        .filter(Boolean)
        .join("\n");
    })
    .filter(Boolean)
    .join("\n\n");
};

/**
 * Evaluates patient address from the FHIR bundle and formats it into structured data for display.
 * @param fhirBundle - The FHIR bundle containing patient contact info.
 * @returns The formatted patient address
 */
export const evaluatePatientAddress = (patient: Patient | undefined) => {
  const addresses = evaluateAll(patient, fhirPathMappings.patientAddressList);

  return formatAddressList(addresses);
};

/**
 * Evaluates demographic data from the FHIR bundle and formats it into structured data for display.
 * @param fhirBundle - The FHIR bundle containing demographic data.
 * @returns An array of evaluated and formatted demographic data.
 */
export const evaluateDemographicsData = (
  fhirBundle: Bundle,
  fhirIndex: FhirIndex,
) => {
  const patient = getPatient(fhirIndex);
  const resourcesRelatedPerson = getResourcesByType<RelatedPerson>(
    fhirIndex,
    "RelatedPerson",
  );

  const patientSex = toTitleCase(
    evaluateOne(patient, fhirPathMappings.patientGender),
  );

  const demographicsData: DisplayDataProps[] = [
    {
      title: "Patient Name",
      value: evaluatePatientName(patient, false),
    },
    {
      title: "DOB",
      value: evaluatePatientDOB(patient),
    },
    createPatientAgeDataProp(fhirBundle, patient),
    {
      title: "Vital Status",
      value: evaluatePatientVitalStatus(patient),
    },
    {
      title: "Death Date/Time",
      value: formatDateTime(evaluateOne(patient, fhirPathMappings.patientDOD)),
    },
    {
      title: "Sex",
      // Unknown and Other sex options removed to be in compliance with Executive Order 14168
      value: censorGender(patientSex),
    },
    {
      title: "Race",
      value: evaluatePatientRace(patient),
    },
    {
      title: "Ethnicity",
      value: evaluatePatientEthnicity(patient),
    },
    {
      title: "Tribal Affiliation",
      value: evaluateValue(patient, fhirPathMappings.patientTribalAffiliation),
    },
    {
      title: "Preferred Language",
      value: evaluatePatientLanguage(patient),
    },
    {
      title: "Patient Address",
      value: evaluatePatientAddress(patient),
    },
    {
      title: "Recent County",
      value: findCurrentAddress(
        evaluateAll(patient, fhirPathMappings.patientAddressList),
      )?.district,
    },
    {
      title: "Contact",
      value: formatContactPoint(
        evaluateAll(patient, fhirPathMappings.patientTelecom),
      ),
    },
    {
      title: "Parent/Guardian",
      value: formatPatientContactList(
        evaluateAll(fhirBundle, fhirPathMappings.patientGuardian),
        true,
      ),
    },
    {
      title: "Emergency Contact",
      value: formatPatientContactList(
        evaluateAll(patient, fhirPathMappings.patientEmergencyContact),
      ),
    },
    {
      title: "Patient IDs",
      toolTip:
        "Unique patient identifier(s) from their medical record. For example, a patient's social security number or medical record number.",
      value: evaluateValue(patient, fhirPathMappings.patientIds),
    },
  ];
  return evaluateData(demographicsData);
};
