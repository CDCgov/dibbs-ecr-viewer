import { FhirResource } from "fhir/r4";

import { evaluateOne } from "@/app/utils/evaluate";
import { FhirPath, PathTypes } from "@/app/utils/evaluate/fhir-paths";

type DatePathTypes = {
  [K in keyof PathTypes]: PathTypes[K] extends
    | string
    | { start?: string; end?: string }
    ? K
    : never;
}[keyof PathTypes];

const ONGOING_DATE = new Date("9999-01-01");

const parseDate = (dateString: string | undefined): Date | undefined =>
  dateString ? new Date(dateString) : undefined;

const getDates = (
  resource: FhirResource,
  datePath: FhirPath<DatePathTypes>,
) => {
  const dateElement = evaluateOne(resource, datePath);

  if (!dateElement) return { effective: undefined, start: undefined };

  if (typeof dateElement === "string") {
    return { effective: new Date(dateElement), start: undefined };
  }

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

/**
 * Compare two FHIR resources by the date specified by the `datePath`.
 *
 * This is useful when you want to sort by a FHIR resource's date but you are working with more complicated data structures than `Resource[]`.
 * @param a - A FHIR resource
 * @param b - A FHIR resource
 * @param datePath HIR path to either a Period or a date string on the resources given.
 * @returns if the date is undefined for both resources 0, if b's date is undefined 1, if a's date is undefined -1, otherwise returns the difference. between b's dates and a's date.
 */
export const compareResourcesByDate = (
  a: FhirResource,
  b: FhirResource,
  datePath: FhirPath<DatePathTypes>,
): number => {
  const datesA = getDates(a, datePath);
  const datesB = getDates(b, datePath);

  const effectiveDiff = compareDates(datesA.effective, datesB.effective);
  return effectiveDiff || compareDates(datesA.start, datesB.start);
};

/**
 * Sorts in-place an array of FHIR resources in descending order (most recent first) list of resources by the date specified by `datePath`.
 * @param resourceArray - Array of FHIR resources of the same type
 * @param datePath - FHIR path to either a Period or a date string on the resource
 */
export const sortResourcesByDate = <T extends FhirResource>(
  resourceArray: T[],
  datePath: FhirPath<DatePathTypes>,
) => {
  resourceArray.sort((a, b) => compareResourcesByDate(a, b, datePath));
};
