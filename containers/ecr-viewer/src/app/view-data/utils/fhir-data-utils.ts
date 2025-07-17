import { Observation, Period } from "fhir/r4";

import { evaluateOne } from "@/app/utils/evaluate";
import fhirPathMappings from "@/app/utils/evaluate/fhir-paths";

const getObservationDate = (obs: Observation): Date | undefined => {
  const date = evaluateOne(obs, fhirPathMappings.effectiveX);

  if (date) {
    if (typeof date === "string") {
      return new Date(date);
    } else if (date.start && !date.end) {
      return new Date("9999-01-01"); // Ongoing, arbitrary date in the future
    } else if (date.end) {
      return new Date(date.end);
    }
  }
};

const compareObservationsByDate = (a: Observation, b: Observation) => {
  let date_a = getObservationDate(a);
  let date_b = getObservationDate(b);
  if (date_a && date_b) {
    const difference = date_b.getTime() - date_a.getTime(); // Sort descending

    if (difference === 0) {
      // If the same date, check if they have start dates, they do, use that

      const dateElement_a = evaluateOne(a, fhirPathMappings.effectiveX);
      const dateElement_b = evaluateOne(b, fhirPathMappings.effectiveX);

      const start_a = (dateElement_a as Period).start;
      const start_b = (dateElement_b as Period).start;

      date_a = start_a ? new Date(start_a) : undefined;
      date_b = start_b ? new Date(start_b) : undefined;

      if (date_a && date_b) {
        return date_b.getTime() - date_a.getTime();
      } else if (date_a) {
        return -1; // a comes before b
      } else if (date_b) {
        return 1; // b comes before a
      } else {
        return 0;
      }
    } else {
      return difference;
    }
  } else if (date_a) {
    return -1; // a comes before b
  } else if (date_b) {
    return 1; // b comes before a
  } else {
    return 0; // No change in order
  }
};

/**
 * Return an descending order (most recent first) list of observations by `effective[x]` (period or DateTime).
 *
 * If observation has `effectivePeriod` the start date will be used if present, otherwise the end date.
 * @param observationArray Array of observations
 * @returns Ordered list of observations by effective[x]
 */
export const sortObservationsByDate = (observationArray: Observation[]) =>
  observationArray.sort(compareObservationsByDate);
