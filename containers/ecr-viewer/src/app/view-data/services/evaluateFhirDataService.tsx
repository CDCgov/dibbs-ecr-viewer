import "server-only"; // FHIR evaluation should be done server side

import {
  Bundle,
  Condition,
  Encounter,
  Location,
  Organization,
  Practitioner,
  PractitionerRole,
  RelatedPerson,
} from "fhir/r4";
import { DateTime } from "luxon";

import { ExpandCollapseAccordion } from "@/app/components/ExpandCollapseAccordion";
import {
  formatDate,
  formatDateTime,
  formatPeriodDate,
  formatStartEndDate,
  formatStartEndDateTime,
} from "@/app/services/formatDateService";
import {
  formatAddress,
  formatAddressList,
  formatCodeableConcept,
  formatContactPoint,
  formatName,
  formatNameList,
  formatPatientContactList,
  formatAge,
  findCurrentAddress,
  formatCurrentAddress,
} from "@/app/services/formatService";
import { HtmlTableJsonRow } from "@/app/services/htmlTableService";
import { Age } from "@/app/types";
import {
  CompleteData,
  evaluateData,
  isDataAvailable,
  noData,
} from "@/app/utils/data-utils";
import {
  evaluateAll,
  evaluateAllReferences,
  evaluateOne,
  evaluateOneReference,
  evaluateReference,
  evaluateValue,
} from "@/app/utils/evaluate";
import fhirPathMappings from "@/app/utils/evaluate/fhir-paths";
import { toSentenceCase, toTitleCase } from "@/app/utils/format-utils";
import {
  DataDisplay,
  DisplayDataProps,
} from "@/app/view-data/components/DataDisplay";
import EvaluateTable from "@/app/view-data/components/EvaluateTable";
import { JsonTable } from "@/app/view-data/components/JsonTable";
import {
  compareResourcesByDate,
  sortResourcesByDate,
} from "@/app/view-data/utils/fhir-data-utils";

import {
  evaluateTravelHistoryTable,
  returnDisabilityStatusTable,
} from "./socialHistoryService";

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
  const nameList = evaluateAll(fhirBundle, fhirPathMappings.patientNameList);

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
  const addresses = evaluateAll(
    fhirBundle,
    fhirPathMappings.patientAddressList,
  );

  return formatAddressList(addresses);
};

/**
 * Finds correct encounter ID
 * @param fhirBundle - The FHIR bundle containing encounter resources.
 * @returns Encounter ID or empty string if not available.
 */
export const evaluateEncounterId = (fhirBundle: Bundle) => {
  const encounterIDs = evaluateAll(fhirBundle, fhirPathMappings.encounterID);
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
  formatDate(evaluateOne(fhirBundle, fhirPathMappings.patientDOB));

/**
 * Calculates the patient's age at a specific point in time or the current date.
 * @param fhirBundle - The FHIR bundle containing patient information.
 * @param [givenDate] - Optional date to calculate age at.
 * @returns The patient's age in years, or undefined if patient has no birth date.
 */
export const calculatePatientAge = (
  fhirBundle: Bundle,
  givenDate?: string,
): Age | undefined => {
  const patientDOBString = evaluateOne(fhirBundle, fhirPathMappings.patientDOB);

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
 * Evaluates patient's vital status from the FHIR bundle and formats it into structured data for display.
 * @param fhirBundle The FHIR bundle containing the patient's vital status
 * @returns The vital status of the patient, either `Alive`, `Deceased`, or `""` (if not found)
 */
export const evaluatePatientVitalStatus = (fhirBundle: Bundle) => {
  const isDeceased = isPatientDeceased(fhirBundle);
  if (isDeceased === undefined) {
    return "";
  } else {
    return isDeceased === true ? "Deceased" : "Alive";
  }
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
 * Evaluates occupation information from the FHIR bundle and formats it into structured data for display.
 * @param fhirBundle - The FHIR bundle containing alcohol use data.
 * @returns An array of evaluated and formatted occupation data.
 */
export const evaluateOccupation = (fhirBundle: Bundle) => {
  const occupationObs = evaluateOne(
    fhirBundle,
    fhirPathMappings.patientOccupation,
  );
  const employmentObs = evaluateAll(
    fhirBundle,
    fhirPathMappings.patientEmploymentStatus,
  );
  if (!occupationObs && employmentObs.length === 0) return;

  const occTitle = formatCodeableConcept(occupationObs?.valueCodeableConcept);
  const occDates = formatPeriodDate(occupationObs?.effectivePeriod);
  const usualIndustryComp = occupationObs?.component?.find(
    (c) => c?.code.coding?.[0].code === "21844-6",
  );
  const usualIndustry = formatCodeableConcept(
    usualIndustryComp?.valueCodeableConcept,
  );

  sortResourcesByDate(employmentObs, fhirPathMappings.effectiveX);
  const currentEmploymentStatus = evaluateValue(
    employmentObs,
    fhirPathMappings.valueX,
  );

  return [
    occTitle,
    usualIndustry && `Industry: ${usualIndustry}`,
    currentEmploymentStatus && `Status: ${currentEmploymentStatus}`,
    occDates && `Dates: ${occDates}`,
  ]
    .filter(Boolean)
    .join("\n\n");
};

/**
 * Evaluate pregnancy data from the FHIR bundle and formats it into structured data for display.
 * @param fhirBundle - The FHIR bundle containing pregnancy data.
 * @returns An array of evaluated and formatted pregnancy data.
 */
export const evaluatePregnancyData = (fhirBundle: Bundle): CompleteData => {
  // TODO: Ideally the `unavailableData` list would include all subfields of the different observations.
  // However the unavailable data section will need to be modified to handle nested fields like this (this
  // also applies to the occupational history in social history). This function will likely need to be
  // rewritten for the changes to the pregnancy section front-end, and whenever the unavailable data
  // section can handle nested sub-fields.
  const lastMenstrualPeriodObservationEntries = evaluateAll(
    fhirBundle,
    fhirPathMappings.lastMenstrualPeriod,
  ).map((ob) => {
    return {
      type: "Last Menstrual Period",
      observation: ob,
      data: [
        {
          title: "Last Menstrual Period",
          value: evaluateValue(ob, fhirPathMappings.effectiveX),
        },
      ].filter(isDataAvailable),
    };
  });
  const pregnancyStatusObservationEntries = evaluateAll(
    fhirBundle,
    fhirPathMappings.pregnancyStatus,
  ).map((ob) => {
    return {
      type: "Pregnancy Status",
      observation: ob,
      data: [
        {
          title: "Status",
          value: evaluateValue(ob, "valueCodeableConcept"),
        },
        {
          title: "Effective Date",
          value: evaluateValue(ob, fhirPathMappings.effectiveX),
        },
      ].filter(isDataAvailable),
    };
  });
  const postpartumStatusObservationEntries = evaluateAll(
    fhirBundle,
    fhirPathMappings.postpartumStatus,
  ).map((ob) => {
    return {
      type: "Postpartum Status",
      observation: ob,
      data: [
        {
          title: "Status",
          value: evaluateValue(ob, "valueCodeableConcept"),
        },
        {
          title: "Effective Date",
          value: evaluateValue(ob, fhirPathMappings.effectiveX),
        },
      ].filter(isDataAvailable),
    };
  });

  const unavailableData = [];

  if (lastMenstrualPeriodObservationEntries.length === 0) {
    unavailableData.push({
      title: "Last Menstrual Period",
      value: undefined,
    });
  }
  if (pregnancyStatusObservationEntries.length === 0) {
    unavailableData.push({
      title: "Pregnancy Status",
      value: undefined,
    });
  }
  if (postpartumStatusObservationEntries.length === 0) {
    unavailableData.push({
      title: "Postpartum Status",
      value: undefined,
    });
  }

  // Using `compareResourcesByDate` because we want to apply the consistent date ordering we are using elsewhere, but we're not sorting `Observation[]`, but instead an object containing an `Observation`.
  const allPregnancyObservations = [
    ...lastMenstrualPeriodObservationEntries,
    ...pregnancyStatusObservationEntries,
    ...postpartumStatusObservationEntries,
  ].sort((a, b) =>
    compareResourcesByDate(
      a.observation,
      b.observation,
      fhirPathMappings.effectiveX,
    ),
  );

  if (allPregnancyObservations.length === 0)
    return { availableData: [], unavailableData };

  const pregnancyElement = (
    <ExpandCollapseAccordion
      className="accordion-rr"
      descriptor="pregnancy info"
      items={allPregnancyObservations.map((obs) => {
        const id = obs.observation.id ?? `${Math.random()}`;
        const content = obs.data.map((d, i) => (
          <DataDisplay key={`${id}-${i}`} item={d} />
        ));
        return {
          title: (
            <div className="display-flex flex-row flex-no-wrap flex-justify">
              <span className="text-base">{obs.type}</span>
            </div>
          ),
          expanded: false,
          content,
          id,
          headingLevel: "h5",
        };
      })}
    />
  );

  return {
    availableData: [
      {
        value: pregnancyElement,
        fullWidthContent: true,
      },
    ],
    unavailableData,
  };
};

/**
 * Evaluates occupation history information from the FHIR bundle and formats it into structured data for display.
 * @param fhirBundle - The FHIR bundle containing alcohol use data.
 * @returns An array of evaluated and formatted occupation history data.
 */
export const evaluateOccupationHistory = (fhirBundle: Bundle) => {
  const jobObs = evaluateAll(
    fhirBundle,
    fhirPathMappings.patientOccupationHistory,
  );
  if (jobObs.length === 0) return;

  sortResourcesByDate(jobObs, fhirPathMappings.effectiveX);

  return (
    <ExpandCollapseAccordion
      className="accordion-rr"
      descriptor="employment details"
      items={jobObs.map((obs) => {
        const getComponentValue = (code: string) => {
          return (
            evaluateValue(
              obs,
              `component.where(code.coding.code = '${code}').value`,
            ) || noData
          );
        };

        const employerRef = evaluateValue(
          obs,
          "extension.where(url = 'http://hl7.org/fhir/us/odh/StructureDefinition/odh-Employer-extension').value",
        );
        const employer = evaluateReference<RelatedPerson | Organization>(
          fhirBundle,
          employerRef,
        );

        const workplaceInfo = [
          {
            title: "Address",
            value: formatCurrentAddress(employer?.address) || noData,
          },
          {
            title: "Schedule",
            value: getComponentValue("74159-5"),
          },
          {
            title: "Hours",
            value: getComponentValue("87512-0"),
          },
          {
            title: "Days",
            value: getComponentValue("74160-3"),
          },
          {
            title: "Duties",
            value: getComponentValue("63761-1"),
          },
          {
            title: "Pay Grade",
            value: getComponentValue("87707-6"),
          },
          {
            title: "Employment Type",
            value: getComponentValue("85104-8"),
          },
        ];

        const hasWorkplaceContent = workplaceInfo.some(
          ({ value }) => value !== noData,
        );

        const workplaceContent = hasWorkplaceContent
          ? workplaceInfo.map(({ title, value }, i) => (
              <DataDisplay
                key={`wi-${i}`}
                item={{
                  title,
                  value,
                  dividerLine: false,
                  titleNormal: true,
                }}
              />
            ))
          : noData;

        const content = (
          <>
            <DataDisplay
              item={{
                title: "Dates",
                value: formatPeriodDate(obs.effectivePeriod),
              }}
            />
            <DataDisplay
              item={{
                title: "Industry",
                value: getComponentValue("86188-0"),
              }}
            />
            <DataDisplay
              item={{
                title: "Workplace Information",
                value: workplaceContent,
                fullWidthContent: hasWorkplaceContent,
              }}
            />
            <DataDisplay
              item={{
                title: "Hazard",
                value: getComponentValue("87729-0"),
                dividerLine: false,
              }}
            />
          </>
        );

        return {
          title: (
            <div className="display-flex flex-row flex-no-wrap flex-justify">
              <span>{formatCodeableConcept(obs.valueCodeableConcept)}</span>
              <span className="font-size-xs text-base">
                {!!obs.effectivePeriod?.end ? "Past" : "Current"} Employment
              </span>
            </div>
          ),
          expanded: false,
          content,
          id: obs.id || `${Math.random()}`,
          headingLevel: "h5",
        };
      })}
    />
  );
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
      value: evaluateOccupation(fhirBundle),
    },
    {
      title: "Occupation History",
      value: evaluateOccupationHistory(fhirBundle),
      fullWidthContent: true,
    },
    {
      title: "Religious Affiliation",
      value: evaluateValue(fhirBundle, fhirPathMappings.patientReligion),
    },
    {
      title: "Marital Status",
      value: evaluateValue(fhirBundle, fhirPathMappings.patientMaritalStatus),
    },
    {
      title: "Nationality",
      value: evaluateValue(fhirBundle, fhirPathMappings.patientNationality),
    },
    {
      title: "Country of Residence",
      value: evaluateValue(
        fhirBundle,
        fhirPathMappings.patientCountryResidence,
      ),
    },
    {
      title: "Disability Status",
      value: returnDisabilityStatusTable(fhirBundle),
      fullWidthContent: true,
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
    evaluateOne(fhirBundle, fhirPathMappings.patientGender),
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
    createPatientAgeDataProp(fhirBundle),
    {
      title: "Vital Status",
      value: evaluatePatientVitalStatus(fhirBundle),
    },
    {
      title: "Date of Death",
      value: evaluateOne(fhirBundle, fhirPathMappings.patientDOD),
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
      title: "Recent County",
      value: findCurrentAddress(
        evaluateAll(fhirBundle, fhirPathMappings.patientAddressList),
      )?.district,
    },
    {
      title: "Contact",
      value: formatContactPoint(
        evaluateAll(fhirBundle, fhirPathMappings.patientTelecom),
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
        evaluateAll(fhirBundle, fhirPathMappings.patientEmergencyContact),
      ),
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
        evaluateOne(fhirBundle, fhirPathMappings.encounterPeriod),
      ),
    },
    {
      title: "Encounter Type",
      value: evaluateOne(fhirBundle, fhirPathMappings.encounterType),
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
 * Evaluates Hospital Encounter Admission and Discharge diagnosis data from the FHIR bundle and formats it into structured data for display.
 * @param fhirBundle - The FHIR bundle containing hospital encounter data.
 * @returns An array of evaluated and formatted hospital encounter data.
 */
export const evaluateHospitalEncounterData = (fhirBundle: Bundle) => {
  const hospitalEncounterData = [
    {
      title: "Hospital Admission Diagnosis",
      value: evaluateEncounterDiagnosisData(
        fhirBundle,
        "46241-6",
        "Hospital Admission Diagnosis",
      ),
      table: true,
    },
    {
      title: "Hospital Discharge Diagnosis",
      value: evaluateEncounterDiagnosisData(
        fhirBundle,
        "11535-2",
        "Hospital Discharge Diagnosis",
      ),
      table: true,
    },
  ];
  return evaluateData(hospitalEncounterData);
};

/**
 * Evaluates either Hospital Admission Diagnosis or Discharge diagnosis data from the FHIR bundle and formats it into structured data for display.
 * @param fhirBundle - The FHIR bundle containing hospital encounter data.
 * @param code - the associated code for the section to be evaluated. e.g. 46241-6 for Admission Dx or 11535-2 for Discharge Dx
 * @param caption - A string to set the caption for the UI element
 * @returns An array of evaluated and formatted hospital encounter data.
 */
const evaluateEncounterDiagnosisData = (
  fhirBundle: Bundle,
  code: string,
  caption: string,
) => {
  const dx = evaluateAllReferences<Condition>(
    fhirBundle,
    fhirPathMappings.hospitalEncounterDiagnosisRef,
    { code },
  );

  if (dx.length === 0) return;

  const dxColumns = [
    {
      columnName: "Problem",
      infoPath: "code",
    },
    {
      columnName: "Date/Time",
      infoPath: "conditionOnsetDate",
      applyToValue: formatDateTime,
    },
  ];

  return <EvaluateTable resources={dx} columns={dxColumns} caption={caption} />;
};

/**
 * Evaluates facility data from the FHIR bundle and formats it into structured data for display.
 * @param fhirBundle - The FHIR bundle containing facility data.
 * @returns An array of evaluated and formatted facility data.
 */
export const evaluateFacilityData = (fhirBundle: Bundle) => {
  const location = evaluateOneReference<Location>(
    fhirBundle,
    fhirPathMappings.facilityLocationRef,
  );
  const org = evaluateOneReference<Organization>(
    fhirBundle,
    fhirPathMappings.facilityOrgRef,
  );

  const facilityData = [
    {
      title: "Facility Name",
      value:
        evaluateOne(fhirBundle, fhirPathMappings.facilityName) ||
        location?.name,
    },
    {
      title: "Facility Address",
      value: formatAddress(location?.address),
    },
    {
      title: "Facility Contact Address",
      value: formatAddressList(org?.address),
    },
    {
      title: "Facility Contact",
      value: formatContactPoint(org?.telecom),
    },
    {
      title: "Facility Type",
      value: evaluateValue(fhirBundle, "facilityType"),
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
  const encounter = evaluateOneReference<Encounter>(
    fhirBundle,
    fhirPathMappings.compositionEncounterRef,
  );

  const encounterAttendingRefs = evaluateAll(
    encounter,
    fhirPathMappings.encounterAttendingRefs,
  );

  // CDA has there being only one responsible party per eCR - find them
  const { practitioner, organization } =
    encounterAttendingRefs
      .map((encounterAttendingRef) =>
        evaluatePractitionerRoleReference(
          fhirBundle,
          encounterAttendingRef.individual?.reference,
        ),
      )
      .find(
        ({ practitioner }) =>
          practitioner?.extension?.find(
            ({ url }) =>
              url === "http://hl7.org/fhir/StructureDefinition/_datatype",
          )?.valueString === "Responsible Party",
      ) || {};

  const providerData: DisplayDataProps[] = [
    {
      title: "Provider Name",
      value: formatName(practitioner?.name?.[0]),
    },
    {
      title: "Provider Address",
      value: formatAddressList(practitioner?.address),
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
      value: formatAddressList(organization?.address),
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
  const encounterRef = evaluateOne(
    fhirBundle,
    fhirPathMappings.compositionEncounterRef,
  );
  const encounter = evaluateReference<Encounter>(fhirBundle, encounterRef);
  const participants = evaluateAll(
    encounter,
    fhirPathMappings.encounterParticipants,
  );

  const tables = participants.map((participant) => {
    const role = evaluateValue(participant, "type");
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
        value: formatStartEndDate(participant.period) || noData,
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
 * Find facility ID based on the first encounter's location
 * @param fhirBundle - The FHIR bundle containing resources.
 * @returns Facility id
 */
export const evaluateFacilityId = (fhirBundle: Bundle) => {
  const location = evaluateOneReference<Location>(
    fhirBundle,
    fhirPathMappings.facilityLocationRef,
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
  return evaluateAllReferences<Condition>(
    fhirBundle,
    fhirPathMappings.encounterDiagnosisRef,
  )
    .map((condition) => formatCodeableConcept(condition?.code))
    .filter(Boolean)
    .join(", ");
};

/**
 * Evaluate patient's preferred language
 * @param fhirBundle - The FHIR bundle containing resources.
 * @returns String containing language, proficiency, and mode
 */
export const evaluatePatientLanguage = (fhirBundle: Bundle) => {
  let patientCommunication = evaluateAll(
    fhirBundle,
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
 * Censors "Unknown" and "Other" gender options for the given string in compliance with Executive Order 14168
 * @param gender - Gender string
 * @returns - if  the string is "Male" or "Female" it returns the string, otherwise it returns an empty string
 */
export const censorGender = (gender: string | undefined) => {
  return gender && ["Male", "Female"].includes(gender) ? gender : "";
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
): DisplayDataProps => {
  const encounterPeriod = evaluateOne(
    fhirBundle,
    fhirPathMappings.encounterPeriod,
  );
  const patientDOBString = evaluateOne(fhirBundle, fhirPathMappings.patientDOB);

  let title = "Age at Encounter";
  let toolTip;
  let value;

  // If patient has death date, return empty object
  if (isPatientDeceased(fhirBundle)) {
    title = "Age at Death";
    const patientDODString = evaluateOne(
      fhirBundle,
      fhirPathMappings.patientDOD,
    );
    if (patientDOBString && patientDODString) {
      value = formatAge(calculatePatientAge(fhirBundle, patientDODString));
    }

    return {
      title,
      value,
      toolTip,
    };
  }

  // Handle encounter start date
  if (encounterPeriod?.start) {
    value = formatAge(calculatePatientAge(fhirBundle, encounterPeriod.start));
    return { title, toolTip, value };
  }

  // Handle encounter end date
  if (encounterPeriod?.end) {
    const encounterEnd = DateTime.fromJSDate(new Date(encounterPeriod.end));

    if (encounterEnd <= DateTime.now()) {
      toolTip =
        "Age at end date of encounter. Start date of encounter is not available.";
      value = formatAge(calculatePatientAge(fhirBundle, encounterPeriod.end));
    } else {
      value = formatAge(
        calculatePatientAge(
          fhirBundle,
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
      fhirBundle,
      evaluateOne(fhirBundle, fhirPathMappings.dateTimeEcrCreated),
    ),
  );
  if (value) {
    toolTip =
      "Using the date eCR was created as a proxy for date of encounter. No encounter date available.";
  }

  return { title, toolTip, value };
};

/***
 * A patient is deceased if `patient.deceasedBoolean` is true or if there is a date of death. If both are `undefined`
 * return `undefined`.
 */
const isPatientDeceased = (fhirBundle: Bundle) => {
  const vitalStatus = evaluateOne(
    fhirBundle,
    fhirPathMappings.patientVitalStatus,
  );
  const dod = evaluateOne(fhirBundle, fhirPathMappings.patientDOD);

  return dod ? true : vitalStatus;
};
