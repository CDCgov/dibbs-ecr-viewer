import {
  Bundle,
  Element,
  Observation,
  RelatedPerson,
  QuestionnaireResponse,
} from "fhir/r4";
import { ExpandCollapseAccordion } from "@/app/components/ExpandCollapseAccordion";
import { HtmlTableJsonRow } from "@/app/services/htmlTableService";
import { JsonTable } from "@/app/view-data/components/JsonTable";

import { formatPatientContactList } from "@/app/services/formatService";
import { noData, notEmpty } from "@/app/utils/data-utils";
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
  ColumnInfoInput,
} from "@/app/view-data/components/EvaluateTable";
import { UnstyledDividedList } from "@/app/view-data/components/UnstyledDividedList";

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
