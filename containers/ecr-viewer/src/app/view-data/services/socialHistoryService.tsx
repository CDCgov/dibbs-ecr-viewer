import {
  Bundle,
  Element,
  Observation,
  RelatedPerson,
  QuestionnaireResponse,
  Organization,
} from "fhir/r4";
import { ExpandCollapseAccordion } from "@/app/components/ExpandCollapseAccordion";
import { HtmlTableJsonRow } from "@/app/services/htmlTableService";
import { JsonTable } from "@/app/view-data/components/JsonTable";

import {
  formatCodeableConcept,
  formatCurrentAddress,
  formatPatientContactList,
} from "@/app/services/formatService";
import { evaluateData, noData, notEmpty } from "@/app/utils/data-utils";
import {
  evaluateAll,
  evaluateOne,
  evaluateReference,
  evaluateValue,
} from "@/app/utils/evaluate";
import fhirPathMappings from "@/app/utils/evaluate/fhir-paths";
import { toSentenceCase } from "@/app/utils/format-utils";
import {
  DataDisplay,
  DataDisplayList,
  DisplayDataProps,
} from "@/app/view-data/components/DataDisplay";
import EvaluateTable, {
  BaseTable,
  ColumnInfoInput,
} from "@/app/view-data/components/EvaluateTable";
import { UnstyledDividedList } from "@/app/view-data/components/UnstyledDividedList";
import { FhirIndex } from "./fhirResourcesIndexService";
import { getPatient } from "@/app/view-data/services/demographicsService";
import {
  formatDateTime,
  formatPeriodDate,
} from "@/app/services/formatDateService";
import { sortResourcesByDate } from "../utils/fhir-data-utils";

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
      value: evaluateTobaccoUse(fhirBundle),
      fullWidthContent: true,
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
 * Evaluates tobacco use information from the FHIR bundle and formats it as a table.
 * @param fhirBundle - The FHIR bundle containing tobacco use data.
 * @returns A table of tobacco use observations, or undefined if none are found.
 */
export const evaluateTobaccoUse = (fhirBundle: Bundle) => {
  const tobaccoObservationGroups = [
    {
      detail: "Smoking Status",
      observations: evaluateAll(
        fhirBundle,
        fhirPathMappings.patientTobaccoUseStatus,
      ),
      formatObservation: (observation: Observation) =>
        evaluateValue(observation, fhirPathMappings.valueX),
    },
    {
      detail: "Smoking History",
      observations: evaluateAll(
        fhirBundle,
        fhirPathMappings.patientTobaccoHistory,
      ),
      formatObservation: (observation: Observation) =>
        evaluateValue(observation, fhirPathMappings.valueX),
    },
    {
      detail: "Amount",
      observations: evaluateAll(
        fhirBundle,
        fhirPathMappings.patientTobaccoAmount,
      ),
      formatObservation: (observation: Observation) => {
        const amount = evaluateValue(observation, fhirPathMappings.valueX);
        return amount ? `${amount} packs per day` : "";
      },
    },
    {
      detail: "Cigarette Pack-years",
      observations: evaluateAll(
        fhirBundle,
        fhirPathMappings.patientTobaccoPackYears,
      ),
      formatObservation: (observation: Observation) =>
        evaluateValue(observation, fhirPathMappings.valueX),
    },
    {
      detail: "Smokeless Status",
      observations: evaluateAll(
        fhirBundle,
        fhirPathMappings.patientSmokelessStatus,
      ),
      formatObservation: (observation: Observation) =>
        evaluateValue(observation, fhirPathMappings.valueX),
    },
    {
      detail: "Tobacco Use Cessation Education",
      observations: evaluateAll(
        fhirBundle,
        fhirPathMappings.patientTobaccoEducation,
      ),
      formatObservation: (observation: Observation) =>
        evaluateAll(observation, fhirPathMappings.noteText).join(","),
    },
  ];

  const tobaccoRows = tobaccoObservationGroups.flatMap(
    ({ detail, observations, formatObservation }) =>
      observations.map((observation) => ({
        detail,
        observation: formatObservation(observation),
        date: evaluateValue(observation, fhirPathMappings.effectiveX),
      })),
  );

  if (tobaccoRows.length === 0) return undefined;

  const columns: ColumnInfoInput[] = [
    { columnName: "Tobacco Detail" },
    { columnName: "Observation" },
    { columnName: "Date" },
  ];

  return (
    <BaseTable columns={columns} fixed={false}>
      {tobaccoRows.map((row, index) => (
        <tr key={`tobacco-row-${index}`}>
          <td className="text-top text-pre-line">{row.detail || noData}</td>
          <td className="text-top text-pre-line">
            {row.observation || noData}
          </td>
          <td className="text-top text-pre-line">{row.date || noData}</td>
        </tr>
      ))}
    </BaseTable>
  );
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
 * Extracts travel history information from the provided FHIR bundle based on the FHIR path mappings.
 * @param fhirBundle - The FHIR bundle containing patient travel history data.
 * @returns - A formatted table representing the patient's travel history, or undefined if no relevant data is found.
 */
export const evaluateTravelHistoryTable = (fhirBundle: Bundle) => {
  const travelHistoryObservations = evaluateAll(
    fhirBundle,
    fhirPathMappings.patientTravelHistory,
  );
  if (!travelHistoryObservations.length) return undefined;

  const columns: ColumnInfoInput[] = [
    {
      columnName: "Location",
      infoPath: "travelHistoryLocation",
    },
    {
      columnName: "Date",
      infoPath: "effectiveX",
    },
    {
      columnName: "Purpose",
      infoPath: "travelHistoryPurpose",
    },
    {
      columnName: "Details",
      hiddenBaseText: "details",
      evaluateEntry: (el) => evaluateTravelHistoryDetails(fhirBundle, el),
    },
  ];

  return (
    <EvaluateTable resources={travelHistoryObservations} columns={columns} />
  );
};

const evaluateTravelHistoryDetails = (
  fhirBundle: Bundle,
  travelObs: Element,
) => {
  const memberRefs = evaluateAll(travelObs, fhirPathMappings.hasMember);
  const obs = memberRefs
    .map((ref) => evaluateReference<Observation>(fhirBundle, ref))
    .filter(notEmpty);

  const transportObs = obs.filter(
    (o) => o.code?.coding?.[0]?.code === "424483007",
  );
  const exposureObs = obs.filter((o) =>
    o.category?.some(
      (c) =>
        c.coding?.[0]?.system ===
        "http://terminology.hl7.org/CodeSystem/v3-ActClass",
    ),
  );

  const content = [
    {
      title: "Transportation Details",
      value: transportObs.length && (
        <UnstyledDividedList
          items={transportObs.map((o, i) => (
            <TransportationDetails
              transportObs={o}
              key={`transport-obs-${i}`}
            />
          ))}
        />
      ),
      fullWidthContent: true,
    },
    {
      title: "Exposure Details",
      value: exposureObs.length && (
        <UnstyledDividedList
          items={exposureObs.map((o, i) => (
            <ExposureDetails
              fhirBundle={fhirBundle}
              exposureObs={o}
              key={`exposure-obs-${i}`}
            />
          ))}
        />
      ),
      fullWidthContent: true,
    },
  ].filter(({ value }) => !!value);

  if (content.length === 0) return;

  return <DataDisplayList items={content} />;
};

const TransportationDetails = ({
  transportObs,
}: {
  transportObs: Observation;
}) => {
  const baseInfo = [
    {
      title: "Transportation Vehicle Type",
      value: evaluateValue(transportObs, fhirPathMappings.valueX),
    },
    {
      title: "Dates",
      value: evaluateValue(transportObs, fhirPathMappings.effectiveX),
    },
  ];

  // Components of the transit obs are key/value pairs of data relevant
  // to that transit type. We display them as we receive them from the eCR.
  const components = transportObs.component || [];
  for (const component of components) {
    baseInfo.push({
      title: evaluateValue(
        component,
        fhirPathMappings.code,
        "Observation.component",
      ),
      value: evaluateValue(
        component,
        fhirPathMappings.valueX,
        "Observation.component",
      ),
    });
  }

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
 * Returns formatted exposure observations.
 * @param fhirBundle - The FHIR bundle containing exposure observation data.
 * @returns The JSX element representing the exposure details, or undefined if no exposure observations are found.
 */
export const evaluateExposureDetails = (fhirBundle: Bundle) => {
  const exposureObservations = evaluateAll(
    fhirBundle,
    fhirPathMappings.exposureObservations,
  );
  if (!exposureObservations.length) return undefined;

  return (
    <UnstyledDividedList
      items={exposureObservations.map((o, i) => (
        <ExposureDetails
          fhirBundle={fhirBundle}
          exposureObs={o}
          key={`exposure-${i}`}
        />
      ))}
    />
  );
};

const ExposureDetails = ({
  fhirBundle,
  exposureObs,
}: {
  fhirBundle: Bundle;
  exposureObs: Observation;
}) => {
  const baseInfo = [
    {
      title: "Exposure Type",
      value: evaluateValue(exposureObs, fhirPathMappings.code) || noData,
    },
    {
      title: "Specific Exposure",
      value: evaluateValue(exposureObs, fhirPathMappings.valueX) || noData,
    },
    {
      title: "Dates",
      value: evaluateValue(exposureObs, fhirPathMappings.effectiveX) || noData,
    },
  ];

  const exposureAgent = evaluateValue(
    exposureObs,
    fhirPathMappings.exposureAgent,
  );
  if (exposureAgent) {
    baseInfo.push({
      title: "Exposure Agent",
      value: exposureAgent,
    });
  }

  const exposureAddress = evaluateValue(
    exposureObs,
    fhirPathMappings.exposureAddress,
  );
  if (exposureAddress) {
    baseInfo.push({
      title: "Location",
      value: exposureAddress,
    });
  }

  const relatedThings = (exposureObs?.focus || [])
    .map((ref) => evaluateReference<RelatedPerson>(fhirBundle, ref))
    .filter(notEmpty);

  for (const thing of relatedThings) {
    const animalSpecies = evaluateValue(thing, fhirPathMappings.animalSpecies);
    if (animalSpecies) {
      baseInfo.push({
        title: "Animal Species",
        value: animalSpecies,
      });
    } else {
      // We've got a human
      const contactInfo = formatPatientContactList([thing]);
      if (contactInfo) {
        baseInfo.push({
          title: "Contact",
          value: contactInfo,
        });
      }
    }

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
  }

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
 * Returns a table displaying disability status survey observations.
 * @param bundle - The FHIR bundle containing disability status observation data.
 * @returns The JSX element representing the disability status table, or undefined if no disability status observations are found.
 */
export const returnDisabilityStatusTable = (
  bundle: Bundle,
): React.JSX.Element | undefined => {
  const disabilityObs = evaluateAll(
    bundle,
    fhirPathMappings.patientDisabilityStatus,
  );
  if (disabilityObs.length === 0) {
    return undefined;
  }

  const columnInfo: ColumnInfoInput[] = [
    {
      columnName: "HHS Disability Data Standard Survey",
      infoPath: "code",
      tooltipText:
        "These questions are used on the American Community Survey (ACS) to measure disability, and were developed by a federal interagency committee.",
    },
    {
      columnName: "Status",
      infoPath: "valueX",
      applyToValue: toSentenceCase,
    },
    {
      columnName: "Dates",
      infoPath: "effectiveX",
    },
  ];

  return (
    <EvaluateTable
      resources={disabilityObs}
      columns={columnInfo}
      className="margin-y-1"
      fixed={false}
    />
  );
};

/**
 * Evaluates Social Determinants of Health (SDOH) from the FHIR bundle and formats it into structured data for display.
 * @param fhirBundle - The FHIR bundle containing SDOH data.
 * @returns An array of evaluated and formatted SDOH questionnaire data.
 */
export const evaluateSocialDeterminantsOfHealth = (fhirBundle: Bundle) => {
  const socialFuncObs = evaluateAll(
    fhirBundle,
    fhirPathMappings.historyOfSocialFunction,
  );

  if (socialFuncObs.length === 0) return;

  return (
    <ExpandCollapseAccordion
      className="accordion-rr"
      descriptor="social determinants of health"
      items={socialFuncObs.map((socialFunc) => {
        const domainRef = evaluateOne(socialFunc, fhirPathMappings.hasMember);

        const domain = evaluateReference<Observation>(fhirBundle, domainRef);

        const questionnaireResponsesRefs = evaluateAll(
          domain,
          fhirPathMappings.observationDerivedFrom,
        );

        const domainQuestionsAndAnswers = questionnaireResponsesRefs.map(
          (ref) => {
            const questionnaireResponse =
              evaluateReference<QuestionnaireResponse>(fhirBundle, ref);

            const items = evaluateAll(
              questionnaireResponse,
              fhirPathMappings.questionnaireItem,
            );

            const questionsAndAnswers = items.map((item, j) => {
              const question = item.text;

              const answers = item.answer || [];
              const answer = answers
                .map((a) =>
                  evaluateValue(
                    a,
                    fhirPathMappings.valueX,
                    "QuestionnaireResponse.item.answer",
                  ),
                )
                .join("\n");

              return {
                Question: {
                  value: question,
                },
                Answer: {
                  value: answer,
                },
              } as HtmlTableJsonRow;
            });

            return questionsAndAnswers;
          },
        );

        const content = [
          <JsonTable
            key={`${domain?.id}-questions-and-answers`}
            jsonTableData={{ tables: domainQuestionsAndAnswers }}
            className="caption-data-title margin-y-0"
            outerBorder={false}
            columnStyles={{
              0: { width: "200px", minWidth: "100px" }, // First column (Question)
              1: { width: "80px", minWidth: "80px" }, // Second column (Answer)
            }}
          />,
        ];

        const h6ClassName =
          "bg-gray-5 margin-x-neg-205 padding-y-2 padding-x-205";
        content.push(
          <h6
            key={`${domain?.id}-finding-title`}
            // inline styling to overwrite usa-prose nested style
            style={{
              marginTop: "-1rem",
              fontWeight: "bold",
              borderBottom: "1px solid black",
            }}
            className={h6ClassName}
          >
            Available Social Determinants of Health Information
          </h6>,
        );

        const findings = domain?.interpretation?.map((item, i) => {
          const riskValue = item.text
            ? item.text
            : evaluateValue(item, fhirPathMappings.codingDisplay);

          return {
            title: "Finding",
            value: riskValue,
          } as DisplayDataProps;
        });

        content.push(
          <DataDisplayList
            key={`${domain?.id}-findings`}
            items={findings ?? []}
          />,
        );

        const domainTitle = evaluateValue(domain, fhirPathMappings.code);

        return {
          title: (
            <div className="display-flex flex-row flex-no-wrap flex-justify">
              <span>{domainTitle}</span>

              <span className="font-size-xs text-base">
                {evaluateValue(domain, fhirPathMappings.effectiveX)}
              </span>
            </div>
          ),
          expanded: false,
          content,
          id: socialFunc.id ?? "ID goes here",
          headingLevel: "h5",
        };
      })}
    />
  );
};
