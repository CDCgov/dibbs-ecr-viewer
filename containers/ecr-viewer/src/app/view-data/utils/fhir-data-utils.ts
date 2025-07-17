import { Observation } from "fhir/r4";

import { evaluateOne } from "@/app/utils/evaluate";
import fhirPathMappings from "@/app/utils/evaluate/fhir-paths";

const ONGOING_DATE = new Date("9999-01-01");

const parseDate = (dateString: string | undefined): Date | undefined =>
  dateString ? new Date(dateString) : undefined;

const getObservationDates = (obs: Observation) => {
  const dateElement = evaluateOne(obs, fhirPathMappings.effectiveX);

  if (!dateElement) return { effective: undefined, start: undefined };

  if (typeof dateElement === "string") {
    return { effective: new Date(dateElement), start: undefined };
  }

  // Handle Period objects
  const start = parseDate(dateElement.start);
  const effective =
    dateElement.start && !dateElement.end
      ? ONGOING_DATE
      : parseDate(dateElement.end);

  return { effective, start };
};

const compareDates = (a: Date | undefined, b: Date | undefined): number => {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return b.getTime() - a.getTime(); // Descending
};

const compareObservationsByDate = (a: Observation, b: Observation): number => {
  const datesA = getObservationDates(a);
  const datesB = getObservationDates(b);

  const effectiveDiff = compareDates(datesA.effective, datesB.effective);
  return effectiveDiff || compareDates(datesA.start, datesB.start);
};

/**
 * Return an descending order (most recent first) list of observations by `effective[x]` (period or DateTime).
 * @param observationArray Array of observations
 * @returns Ordered list of observations by effective[x]
 */
export const sortObservationsByDate = (observationArray: Observation[]) =>
  observationArray.sort(compareObservationsByDate);
