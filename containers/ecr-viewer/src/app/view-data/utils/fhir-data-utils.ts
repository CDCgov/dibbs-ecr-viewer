import { FhirResource, Period } from "fhir/r4";

import { evaluateOne } from "@/app/utils/evaluate";
import { FhirPath, PathTypes } from "@/app/utils/evaluate/fhir-paths";

const ONGOING_DATE = new Date("9999-01-01");

const parseDate = (dateString: string | undefined): Date | undefined =>
  dateString ? new Date(dateString) : undefined;

const getDates = <K extends keyof PathTypes>(
  obs: FhirResource,
  datePath: FhirPath<K>,
) => {
  const dateElement = evaluateOne(obs, datePath) as Period | string;

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

const compareResourcesByDate = <K extends keyof PathTypes>(
  a: FhirResource,
  b: FhirResource,
  datePath: FhirPath<K>,
): number => {
  const datesA = getDates(a, datePath);
  const datesB = getDates(b, datePath);

  const effectiveDiff = compareDates(datesA.effective, datesB.effective);
  return effectiveDiff || compareDates(datesA.start, datesB.start);
};

/**
 * Return an descending order (most recent first) list of resources by the date specified by `datePath`.
 * @param resourceArray - Array of FHIR resources of the same type
 * @param datePath - FHIR path to either a Period or a date string on the resource
 * @returns Ordered list of resources by the date specified
 */
export const sortResourcesByDate = <
  T extends FhirResource,
  K extends keyof PathTypes,
>(
  resourceArray: T[],
  datePath: FhirPath<K>,
): T[] => {
  return resourceArray.sort((a, b) => compareResourcesByDate(a, b, datePath));
};
