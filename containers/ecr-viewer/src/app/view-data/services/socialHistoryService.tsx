import { Bundle, Element, Observation, RelatedPerson } from "fhir/r4";

import { formatPatientContactList } from "@/app/services/formatService";
import { noData, notEmpty } from "@/app/utils/data-utils";
import {
  evaluateAll,
  evaluateReference,
  evaluateValue,
} from "@/app/utils/evaluate";
import fhirPathMappings from "@/app/utils/evaluate/fhir-paths";
import { toSentenceCase } from "@/app/utils/format-utils";
import {
  DataDisplay,
  DataDisplayList,
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
  const memberRefs = evaluateAll(
    travelObs,
    fhirPathMappings.travelHistoryMember,
  );
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
