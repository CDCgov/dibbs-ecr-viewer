import "server-only"; // FHIR evaluation should be done server side

import { Tag } from "@trussworks/react-uswds";
import {
  AdverseEvent,
  Bundle,
  Condition,
  Element,
  Encounter,
  Location,
  Medication,
  MedicationAdministration,
  Observation,
  Organization,
  Practitioner,
  PractitionerRole,
  Procedure,
  RelatedPerson,
} from "fhir/r4";

import { ExpandCollapseAccordion } from "@/app/components/ExpandCollapseAccordion";
import {
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
  formatCurrentAddress,
  formatCoding,
} from "@/app/services/formatService";
import { HtmlTableJsonRow } from "@/app/services/htmlTableService";
import {
  CompleteData,
  evaluateData,
  isDataAvailable,
  noData,
  notEmpty,
} from "@/app/utils/data-utils";
import {
  evaluateAll,
  evaluateAllReferences,
  evaluateOne,
  evaluateOneReference,
  evaluateReference,
  evaluateReference2,
  evaluateValue,
} from "@/app/utils/evaluate";
import fhirPathMappings from "@/app/utils/evaluate/fhir-paths";
import { toSentenceCase, toTitleCase } from "@/app/utils/format-utils";
import {
  DataDisplay,
  DataDisplayList,
  DisplayDataProps,
} from "@/app/view-data/components/DataDisplay";
import EvaluateTable, {
  ColumnInfoInput,
} from "@/app/view-data/components/EvaluateTable";
import { JsonTable } from "@/app/view-data/components/JsonTable";
import { UnstyledDividedList } from "@/app/view-data/components/UnstyledDividedList";
import {
  compareResourcesByDate,
  sortResourcesByDate,
} from "@/app/view-data/utils/fhir-data-utils";

import { getPatient } from "@/app/view-data/services/demographicsService";
import {
  evaluateExposureDetails,
  evaluateTravelHistoryTable,
  returnDisabilityStatusTable,
  evaluateSocialDeterminantsOfHealth,
} from "./socialHistoryService";
import { FhirIndex } from "./fhirResourcesIndexService";

// =============================================================================
// Patient Info: Social History
// =============================================================================

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
    fhirPathMappings.patientOccupationUsual,
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
 * Evaluates occupation history information from the FHIR bundle and formats it into structured data for display.
 * @param fhirBundle - The FHIR bundle containing alcohol use data.
 * @returns An array of evaluated and formatted occupation history data.
 */
export const evaluateOccupationHistory = (fhirBundle: Bundle) => {
  const jobObs = [
    // Employment detail(s) may come from a Past or Present Occupation Obs
    ...evaluateAll(
      fhirBundle,
      fhirPathMappings.patientOccupationFromPastOrPresent,
    ),
    // or a Social History Obs
    ...evaluateAll(
      fhirBundle,
      fhirPathMappings.patientOccupationFromSocialHistory,
    ),
  ];
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
                value: obs.effectivePeriod
                  ? formatPeriodDate(obs.effectivePeriod)
                  : formatDateTime(obs.effectiveDateTime),
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
              <span>
                {formatCodeableConcept(obs.valueCodeableConcept) ??
                  obs.valueString}
              </span>
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
export const evaluateSocialData = (
  fhirBundle: Bundle,
  fhirIndex: FhirIndex,
) => {
  const patient = getPatient(fhirIndex);

  const socialData: DisplayDataProps[] = [
    {
      title: "Exposure Contacts",
      value: evaluateExposureDetails(fhirBundle),
      fullWidthContent: true,
    },
    {
      title: "Tobacco Use",
      value: evaluateValue(fhirBundle, fhirPathMappings.patientTobaccoUse),
    },
    {
      title: "Travel History",
      value: evaluateTravelHistoryTable(fhirBundle),
      fullWidthContent: true,
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
      value: evaluateValue(patient, fhirPathMappings.patientReligion),
    },
    {
      title: "Marital Status",
      value: evaluateValue(patient, fhirPathMappings.patientMaritalStatus),
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
    {
      title: "Social Determinants of Health",
      value: evaluateSocialDeterminantsOfHealth(fhirBundle),
      fullWidthContent: true,
      fullWidthTitle: true,
    },
  ];

  return evaluateData(socialData);
};

// =============================================================================
// Patient Info: Pregnancy Data
// =============================================================================

/**
 * Evaluate pregnancy data from the FHIR bundle and formats it into structured data for display.
 * @param fhirBundle - The FHIR bundle containing pregnancy data.
 * @returns An array of evaluated and formatted pregnancy data.
 */
export const evaluatePregnancyData = (
  fhirBundle: Bundle,
  fhirIndex: FhirIndex,
): CompleteData => {
  const data = [
    ...evaluatePregnancyStatus(fhirBundle),
    {
      title: "Last Menstrual Period",
      value: evaluateLastMenstrualPeriod(fhirBundle),
      fullWidthContent: true,
      toolTip:
        "Last Menstrual Period represents the first day of the last menstrual period of the patient. This section lists multiple periods in collected in chronological order.",
    },
    {
      title: "Pregnancy Intention in the Next Year",
      value: evaluatePregnancyIntention(fhirBundle),
    },
    {
      title: "Date of Last Live Birth",
      value: evaluateDateOfLastLiveBirth(fhirBundle),
    },
    {
      title: "Rh Blood Type",
      value: evaluatePregnancyRhType(fhirBundle),
    },
    {
      title: "D(Rh) Sensitized",
      value: evaluatePregnancyDRhSensitized(fhirBundle),
    },
    {
      title: "Medications Administered",
      value: evaluatePregnancyMedicationsAdministered(fhirBundle, fhirIndex),
    },
  ];

  return evaluateData(data);
};

const evaluatePregnancyStatus = (fhirBundle: Bundle) => {
  // TODO: Ideally the `unavailableData` list would include all subfields of the different observations.
  // However the unavailable data section will need to be modified to handle nested fields like this (this
  // also applies to the occupational history in social history). This function will likely need to be
  // rewritten for the changes to the pregnancy section front-end, and whenever the unavailable data
  // section can handle nested sub-fields.
  const pregnancyStatusObservationEntries =
    evaluatePregnancyStatusEntries(fhirBundle);
  const postpartumStatusObservationEntries = evaluateAll(
    fhirBundle,
    fhirPathMappings.postpartumStatus,
  ).map((ob) => {
    return {
      type: "Postpartum Status",
      tag: "",
      observation: ob,
      data: [
        {
          title: "Status",
          value: evaluateValue(ob, "valueCodeableConcept"),
        },
        {
          title: "Effective Date/Time",
          value: evaluateValue(ob, fhirPathMappings.effectiveX),
        },
      ].filter(isDataAvailable),
    };
  });

  const res: DisplayDataProps[] = [];

  if (pregnancyStatusObservationEntries.length === 0) {
    res.push({
      title: "Pregnancy Status",
      value: undefined,
    });
  }
  if (postpartumStatusObservationEntries.length === 0) {
    res.push({
      title: "Postpartum Status",
      value: undefined,
    });
  }

  // Using `compareResourcesByDate` because we want to apply the consistent date ordering we are using elsewhere, but we're not sorting `Observation[]`, but instead an object containing an `Observation`.
  const allPregnancyObservations = [
    ...pregnancyStatusObservationEntries,
    ...postpartumStatusObservationEntries,
  ].sort((a, b) =>
    compareResourcesByDate(
      a.observation,
      b.observation,
      fhirPathMappings.effectiveX,
    ),
  );

  if (allPregnancyObservations.length > 0) {
    res.push({
      fullWidthContent: true,
      value: (
        <ExpandCollapseAccordion
          className="accordion-rr"
          descriptor="pregnancy info"
          items={allPregnancyObservations.map((obs) => {
            const id = obs.observation.id ?? `${Math.random()}`;
            const content = obs.data.map((d, i) => (
              <DataDisplay
                key={`${id}-${i}`}
                item={{ ...d, dividerLine: i + 1 < obs.data.length }}
              />
            ));
            return {
              title: (
                <div className="display-flex flex-row flex-no-wrap flex-justify">
                  <span>
                    {obs.type}{" "}
                    {obs.tag && (
                      <Tag className="margin-left-105">{obs.tag}</Tag>
                    )}
                  </span>

                  {/** inline style due to existing css rules on this button text */}
                  <span className="text-base" style={{ fontSize: "1rem" }}>
                    {evaluateValue(
                      obs.observation,
                      fhirPathMappings.effectiveX,
                    )}
                  </span>
                </div>
              ),
              expanded: true,
              content,
              id,
              headingLevel: "h5",
            };
          })}
        />
      ),
    });
  }

  return res;
};

const evaluatePregnancyStatusEntries = (fhirBundle: Bundle) => {
  const pregnancyOutcomeObservations = evaluateAll(
    fhirBundle,
    fhirPathMappings.pregnancyOutcome,
  );
  return evaluateAll(fhirBundle, fhirPathMappings.pregnancyStatus).map((ob) => {
    const status = evaluateValue(ob, "valueCodeableConcept");
    const data: DisplayDataProps[] = [
      {
        title: "Status",
        value: status,
      },
      {
        title: "Effective Date/Time",
        value: evaluateValue(ob, fhirPathMappings.effectiveX),
      },
      {
        title: "Pregnancy Determination Date/Time",
        value: evaluateValue(ob, fhirPathMappings.pregnancyDeterminationDate),
      },
      {
        title: "Pregnancy Determination Method",
        value: evaluateValue(ob, fhirPathMappings.method),
      },
    ];

    ob.component?.forEach((component) =>
      data.push({
        title: toTitleCase(
          evaluateValue(
            component,
            fhirPathMappings.code,
            "Observation.component",
          ),
        ),
        value: evaluateValue(
          component,
          fhirPathMappings.valueX,
          "Observation.component",
        ),
      }),
    );

    const fullId = `${ob.resourceType}/${ob.id}`;
    const outcomes = pregnancyOutcomeObservations
      .filter((ob) => ob.focus?.some(({ reference }) => reference === fullId))
      .map((o) => {
        const outcomeItems = [
          {
            title: "Birth Order",
            value: evaluateValue(o, fhirPathMappings.pregnancyBirthOrder),
          },
          {
            title: "Outcome",
            value: evaluateValue(o, fhirPathMappings.valueX),
          },
          {
            title: "Date/Time",
            value: evaluateValue(o, fhirPathMappings.effectiveX),
          },
        ];

        const procedures = o.partOf
          ?.map((ref) => {
            return evaluateReference<Procedure>(fhirBundle, ref.reference);
          })
          .filter((proc): proc is Procedure => proc != undefined);

        procedures?.forEach((procedure) => {
          const procedureName = evaluateValue(procedure, fhirPathMappings.code);
          const procedureDate = evaluateValue(
            procedure,
            fhirPathMappings.procedureDate,
          );
          outcomeItems.push({
            title: "Procedure",
            value: procedureName + "\nPerformed Date/Time: " + procedureDate,
          });
        });

        return outcomeItems;
      });

    if (outcomes.length > 0) {
      data.push({
        title: "Outcomes",
        fullWidthContent: true,
        value: (
          <UnstyledDividedList
            items={outcomes.map((oItems) =>
              oItems.map(({ title, value }, i) => (
                <DataDisplay
                  item={{ title, value, dividerLine: false, titleNormal: true }}
                  key={`item-${i}`}
                />
              )),
            )}
          />
        ),
      });
    }

    ob.hasMember?.forEach((ref) => {
      const supplementalObservation: Observation | undefined =
        evaluateReference(fhirBundle, ref.reference);
      data.push({
        title: toTitleCase(
          evaluateValue(supplementalObservation, fhirPathMappings.code),
        ),
        value: evaluateValue(supplementalObservation, fhirPathMappings.valueX),
      });
    });

    return {
      type: "Pregnancy Status",
      tag: status,
      observation: ob,
      data: data.filter(isDataAvailable),
    };
  });
};

const evaluateLastMenstrualPeriod = (fhirBundle: Bundle) => {
  const observations = sortResourcesByDate(
    evaluateAll(fhirBundle, fhirPathMappings.lastMenstrualPeriod),
    fhirPathMappings.effectiveX,
  );
  if (observations.length === 0) return;

  const columns: ColumnInfoInput[] = [
    {
      columnName: "First Date of the Last Period",
      infoPath: "valueX",
      applyToValue: formatDateTime,
    },
    {
      columnName: "Collection Date/Time",
      infoPath: "effectiveX",
    },
  ];

  return <EvaluateTable resources={observations} columns={columns} />;
};

const evaluatePregnancyIntention = (fhirBundle: Bundle) => {
  const observation = evaluateOne(fhirBundle, fhirPathMappings.pregnancyIntent);

  if (!observation) return;

  const value = evaluateValue(observation, fhirPathMappings.valueX);
  const effective = evaluateValue(observation, fhirPathMappings.effectiveX);

  return value + "\n" + effective;
};

const evaluateDateOfLastLiveBirth = (fhirBundle: Bundle) => {
  const observation = evaluateOne(
    fhirBundle,
    fhirPathMappings.pregnancyLastLiveBirth,
  );

  if (!observation) return;

  const value = evaluateValue(observation, fhirPathMappings.valueX);
  return value;
};

const evaluatePregnancyRhType = (fhirBundle: Bundle) => {
  const observation = evaluateOne(fhirBundle, fhirPathMappings.pregnancyRhType);

  if (!observation) return;

  return evaluateValue(observation, fhirPathMappings.valueX);
};

const evaluatePregnancyDRhSensitized = (fhirBundle: Bundle) => {
  const observation = evaluateOne(
    fhirBundle,
    fhirPathMappings.pregnancyDRhSensitized,
  );

  if (!observation) return;
  return evaluateValue(observation, fhirPathMappings.valueX);
};

const evaluatePregnancyMedicationsAdministered = (
  fhirBundle: Bundle,
  fhirIndex: FhirIndex,
) => {
  const pregnancyMedicationAdministrationRefs =
    evaluateAllReferences<MedicationAdministration>(
      fhirBundle,
      fhirPathMappings.pregnancyMedicationAdministrationRefs,
    );

  const entries = pregnancyMedicationAdministrationRefs.map(
    (medicationAdministration) => {
      let medication: Medication | undefined;
      if (medicationAdministration?.medicationReference?.reference) {
        medication = evaluateReference2(
          fhirIndex,
          medicationAdministration.medicationReference.reference,
        );
      }

      const name = formatCodeableConcept(medication?.code);
      const effective = evaluateValue(
        medicationAdministration,
        fhirPathMappings.effectiveX,
      );

      return name + "\n" + effective;
    },
  );

  return entries.join("\n\n");
};

// =============================================================================
// Encounter Info: Encounter Details
// =============================================================================

/**
 * Evaluate an encounters diagnosis by returning a comma delimited list of formatted codeable concepts from each condition
 * @param fhirBundle FHIR bundle
 * @param encounter Encounter
 * @returns delimited list of formatted codeable concepts from each condition in the encounters diagnosis
 */
export const evaluateEncounterDiagnosis = (
  fhirBundle: Bundle,
  encounter: Encounter | undefined,
) => {
  return evaluateAllReferences<Condition>(
    fhirBundle,
    fhirPathMappings.encounterDiagnosisRef,
    { id: encounter?.id },
  )
    .map((condition) => formatCodeableConcept(condition?.code))
    .filter(Boolean)
    .join(", ");
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
 * Evaluates encounter data from the FHIR bundle and formats it into structured data for display.
 * @param fhirBundle - The FHIR bundle containing encounter data.
 * @returns An array of evaluated and formatted encounter data.
 */
export const evaluateEncounterData = (fhirBundle: Bundle) => {
  const encounter = evaluateOneReference<Encounter>(
    fhirBundle,
    fhirPathMappings.compositionEncounterRef,
  );
  const encounterData = [
    {
      title: "Encounter Date/Time",
      value: formatStartEndDateTime(encounter?.period),
    },
    {
      title: "Encounter Type",
      value: formatCoding(encounter?.class),
    },
    {
      title: "Encounter ID",
      value: encounter?.identifier?.filter((id) => id.value)[0]?.value,
    },
    {
      title: "Encounter Diagnosis",
      value: evaluateEncounterDiagnosis(fhirBundle, encounter),
    },
    {
      title: "Encounter Care Team",
      value: evaluateEncounterCareTeamTable(fhirBundle),
      table: true,
    },
  ];
  return evaluateData(encounterData);
};

// =============================================================================
// Encounter Info: Hospital Encounter Details
// =============================================================================

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
 * Generates a formatted table representing the list of Admission Medications based on the provided array of Admission Medications and mappings.
 * @param fhirBundle - The fhir bundle
 * @returns - A formatted table React element representing the list of Admission Medications, or undefined if the array is empty.
 */
export const returnAdmissionMedicationsTable = (
  fhirBundle: Bundle,
): React.JSX.Element | undefined => {
  const admissionMedications = evaluateAllReferences(
    fhirBundle,
    fhirPathMappings.admissionMedicationRefs,
  );

  if (admissionMedications.length === 0) {
    return undefined;
  }

  const columnInfo: ColumnInfoInput[] = [
    {
      columnName: "Medication Name",
      evaluateEntry: (el) => {
        const medRef = evaluateOne(
          el,
          fhirPathMappings.medicationAdministrationMedicationRef,
        );
        const medication = evaluateReference(fhirBundle, medRef);
        return evaluateValue(medication, fhirPathMappings.code);
      },
    },
    { columnName: "Dose Quantity", infoPath: "medicationDose" },
    {
      columnName: "Start Date",
      evaluateEntry: (el) => {
        return evaluateValue(el, fhirPathMappings.effectiveX).replace(
          "Start: ",
          "",
        );
      },
    },
    { columnName: "Status", infoPath: "status" },
    {
      columnName: "Details",
      hiddenBaseText: "details",
      evaluateEntry: (el) => evaluateAdmissionMedicationDetails(fhirBundle, el),
    },
  ];

  return (
    <EvaluateTable
      resources={admissionMedications}
      columns={columnInfo}
      caption="Admission Medications"
      className="margin-y-0"
    />
  );
};

/**
 * Generates details sections for the Admission Medications table rows.
 * @param fhirBundle - The fhir bundle
 * @param element - The current row being processed
 * @returns - A details element for the current row of the Admission Medications table, or undefined if there's no data
 */
const evaluateAdmissionMedicationDetails = (
  fhirBundle: Bundle,
  element: Element,
) => {
  const performerRefs = evaluateAll(
    element,
    fhirPathMappings.medicationAdministrationPerformerRef,
  );
  const authors = performerRefs
    .map((r) => evaluateReference<Practitioner>(fhirBundle, r.reference))
    .filter(notEmpty);

  const reactionRefs = evaluateAll(
    element,
    fhirPathMappings.medicationAdministrationReactionRef,
  );

  const adverseEvents = reactionRefs
    .map((r) => evaluateReference<AdverseEvent>(fhirBundle, r.reference))
    .filter(notEmpty);

  if (authors.length === 0 && adverseEvents.length === 0) {
    return;
  }

  const content = [
    {
      title: "Medication Details",
      value: (
        <UnstyledDividedList
          items={[
            <MedicationDetails
              practitioners={authors}
              reactions={adverseEvents}
            />,
          ]}
        />
      ),
      fullWidthContent: true,
    },
  ];

  if (content.length === 0) return;

  return <DataDisplayList items={content} />;
};

type MedicationDetailsProps = {
  practitioners: Practitioner[];
  reactions: AdverseEvent[];
};

const MedicationDetails: React.FC<MedicationDetailsProps> = ({
  practitioners,
  reactions,
}) => {
  const authorsStr = practitioners
    .map((p: Practitioner) => formatName(p.name?.[0]))
    .filter(Boolean)
    .join("\n");

  const reactionsStr = Array.from(
    new Set(
      reactions.flatMap(
        (r: AdverseEvent) =>
          r.event?.coding?.map((c) => c.display || c.code || "") ?? [],
      ),
    ),
  )
    .filter(Boolean)
    .join("\n");

  const baseInfo = [
    authorsStr && { title: "Author", value: authorsStr },
    reactionsStr && { title: "Reaction", value: reactionsStr },
  ].filter(Boolean) as { title: string; value: string }[];

  return baseInfo.map(({ title, value }, i) => (
    <DataDisplay
      key={`wi-${i}`}
      item={{
        title,
        value,
        dividerLine: false,
        titleNormal: true,
      }}
    />
  ));
};

/**
 * Evaluates Hospital Encounter Admission Diagnosis, Admission Medications, and Discharge diagnosis data from the FHIR bundle and formats it into structured data for display.
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
      title: "Admission Medications",
      value: returnAdmissionMedicationsTable(fhirBundle),
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

// =============================================================================
// Encounter Info: Facility Details
// =============================================================================

/**
 * Get an encounter's location name by first looking for the `display` of the `location.location`. If that does not exist, then evaluate each location reference and return the `name` of the first location with a `name`.
 * @param bundle - The FHIR Bundle.
 * @param encounter The relevant Encounter.
 * @returns string or undefined
 */
export const getLocationName = (
  bundle: Bundle,
  encounter: Encounter | undefined,
) => {
  const encounterLocationDisplay = encounter?.location?.filter(
    (location) => location.location.display,
  )[0]?.location.display;

  if (encounterLocationDisplay) {
    return encounterLocationDisplay;
  }

  const references = encounter?.location
    ?.filter((location) => location.location.reference)
    .map((location) => location.location.reference);
  const locations = references
    ?.map((reference) => evaluateReference<Location>(bundle, reference))
    ?.filter((location) => location?.name);
  const locationName = locations?.at(0)?.name;

  return locationName;
};

/**
 * Evaluates facility data from the FHIR bundle and formats it into structured data for display.
 * @param fhirBundle - The FHIR bundle containing facility data.
 * @returns An array of evaluated and formatted facility data.
 */
export const evaluateFacilityData = (fhirBundle: Bundle) => {
  const encounter = evaluateOneReference<Encounter>(
    fhirBundle,
    fhirPathMappings.compositionEncounterRef,
  );

  const locationRef = evaluateOne(
    encounter,
    fhirPathMappings.facilityLocationRef,
  );
  const location = evaluateReference<Location>(fhirBundle, locationRef);

  const orgRef = evaluateOne(encounter, fhirPathMappings.facilityOrgRef);
  const org = evaluateReference<Organization>(fhirBundle, orgRef);

  const facilityData = [
    {
      title: "Facility Name",
      value: getLocationName(fhirBundle, encounter),
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
      value: location?.type && formatCodeableConcept(location?.type[0]),
    },
    {
      title: "Facility ID",
      value: location?.identifier?.filter((id) => id.value)[0]?.value,
    },
  ];
  return evaluateData(facilityData);
};

// =============================================================================
// Encounter Info: Provider Details
// =============================================================================

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
