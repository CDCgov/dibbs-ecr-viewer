import "server-only"; // FHIR evaluation should be done server side

import { Tag } from "@trussworks/react-uswds";
import {
  Bundle,
  Medication,
  MedicationAdministration,
  Observation,
  Procedure,
} from "fhir/r4";

import { ExpandCollapseAccordion } from "@/app/components/ExpandCollapseAccordion";
import { formatDateTime } from "@/app/services/formatDateService";
import { formatCodeableConcept } from "@/app/services/formatService";
import {
  CompleteData,
  evaluateData,
  isDataAvailable,
} from "@/app/utils/data-utils";
import {
  evaluateAll,
  evaluateAllReferences,
  evaluateOne,
  evaluateReference,
  evaluateReference2,
  evaluateValue,
} from "@/app/utils/evaluate";
import fhirPathMappings from "@/app/utils/evaluate/fhir-paths";
import { toTitleCase } from "@/app/utils/format-utils";
import {
  DataDisplay,
  DisplayDataProps,
} from "@/app/view-data/components/DataDisplay";
import EvaluateTable, {
  ColumnInfoInput,
} from "@/app/view-data/components/EvaluateTable";
import { UnstyledDividedList } from "@/app/view-data/components/UnstyledDividedList";
import {
  compareResourcesByDate,
  sortResourcesByDate,
} from "@/app/view-data/utils/fhir-data-utils";
import { FhirIndex } from "./fhirResourcesIndexService";

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
    {
      title: "History of Pregnancies",
      value: evaluatePregnancySummary(fhirBundle, fhirIndex),
      fullWidthContent: true,
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

    const notes = evaluateAll(ob, fhirPathMappings.noteText);
    if (notes.length > 0) {
      data.push({
        title: "Comments",
        value: notes.join("\n"),
      });
    }

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

const evaluatePregnancySummary = (fhirBundle: Bundle, fhirIndex: FhirIndex) => {
  const observation = evaluateOne(
    fhirBundle,
    fhirPathMappings.pregnancySummary,
  );

  const pregnancySummaryObs: Observation[] = [];

  observation?.hasMember?.forEach((memberRef) => {
    const memberObs = evaluateReference2<Observation>(fhirIndex, memberRef);
    if (memberObs) {
      pregnancySummaryObs.push(memberObs);
    }
  });

  if (!pregnancySummaryObs?.length) return undefined;

  const columns: ColumnInfoInput[] = [
    {
      columnName: "Context",
      infoPath: "code",
    },
    {
      columnName: "Value",
      infoPath: "valueX",
    },
    {
      columnName: "Date",
      infoPath: "effectiveX",
    },
  ];

  return <EvaluateTable resources={pregnancySummaryObs} columns={columns} />;
};
