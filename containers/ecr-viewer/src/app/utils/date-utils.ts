import { toSentenceCase } from "@/app/utils/format-utils";

export interface DateRangePeriod {
  startDate: Date;
  endDate: Date;
}

export enum DateRangeOptions {
  Last24Hours = "last-24-hours",
  Last7Days = "last-7-days",
  Last30Days = "last-30-days",
  Last3Months = "last-3-months",
  Last6Months = "last-6-months",
  LastYear = "last-year",
}

export const CustomDateRangeOption = "custom";

const isProd = process.env.NODE_ENV === "production";
// Local dev default = Last year ; Prod default = Last 24 hours
export const DEFAULT_DATE_RANGE = isProd
  ? DateRangeOptions.Last24Hours
  : DateRangeOptions.LastYear;

export const dateRangeLabels: { [key in DateRangeOptions]: string } =
  Object.fromEntries(
    Object.values(DateRangeOptions).map((k) => [
      k,
      toSentenceCase(k.replace(/-/g, " ")) as string,
    ]),
  ) as { [key in DateRangeOptions]: string };

/**
 * Calculates the date a specified number of days ago from the given date
 * @param refDate - The reference date
 * @param days - The number of days to subtract from the reference date
 * @param resetHours - If true, resets the time to the start of the day (00:00:00.000) local time
 * @returns The updated date
 */
function daysAgoDate(refDate: Date, days: number, resetHours: boolean = true) {
  const updatedDate = new Date(refDate); // Clone the reference date
  updatedDate.setDate(refDate.getDate() - days); // Subtract the days

  if (resetHours) {
    updatedDate.setHours(0, 0, 0, 0); // Reset to midnight in local time
  }
  return updatedDate;
}

/**
 * Calculates the date a specified number of months ago from the given date
 * @param refDate - The reference date
 * @param months - The number of months to subtract from the reference date
 * @returns The updated date
 */
function monthsAgoDate(refDate: Date, months: number) {
  const updatedDate = new Date(refDate);
  updatedDate.setMonth(refDate.getMonth() - months);
  updatedDate.setHours(0, 0, 0, 0);
  return updatedDate;
}

/**
 * Converts a filter date option to a valid date range.
 * @param filterOption - The selected filter option from the options list.
 * @param endDate - (Optional) Specified end date for date range, defaults to today
 * @returns An object containing the start and end dates of the specified range.
 */
export function convertDateOptionToDateRange(
  filterOption: string,
  endDate?: Date,
) {
  const today = new Date();
  const currentEndDate = endDate || today;

  switch (filterOption) {
    case DateRangeOptions.Last24Hours:
      return {
        startDate: daysAgoDate(currentEndDate, 1, false),
        endDate: currentEndDate,
      };
    case DateRangeOptions.Last7Days:
      return {
        startDate: daysAgoDate(currentEndDate, 7),
        endDate: currentEndDate,
      };
    case DateRangeOptions.Last30Days:
      return {
        startDate: daysAgoDate(currentEndDate, 30),
        endDate: currentEndDate,
      };
    case DateRangeOptions.Last3Months:
      return {
        startDate: monthsAgoDate(currentEndDate, 3),
        endDate: currentEndDate,
      };
    case DateRangeOptions.Last6Months:
      return {
        startDate: monthsAgoDate(currentEndDate, 6),
        endDate: currentEndDate,
      };
    case DateRangeOptions.LastYear:
      return {
        startDate: monthsAgoDate(currentEndDate, 12),
        endDate: currentEndDate,
      };
    default:
      throw new Error("Invalid filter option");
  }
}

/**
 * Builds object with start and end dates (as Date objects) from custom date range string.
 * @param datesString - A string representing the date range in the format "YYYY-MM-DD|YYYY-MM-DD" (start_date|end_date).
 * @returns An object containing the `startDate` and `endDate` as Date objects.
 *          The `startDate` is set to the start of the day (00:00:00.000),
 *          and the `endDate` is set to the end of the day (23:59:59.999).
 */
export function buildCustomDateRange(datesString: string) {
  const [startDate, endDate] = datesString.split("|").map((date) => {
    // Split the input and parse the date as local time
    const [year, month, day] = date.split("-"); // YYYY-MM-DD
    const localDate = new Date();
    localDate.setFullYear(parseInt(year), parseInt(month) - 1, parseInt(day));
    return localDate;
  });
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);
  return { startDate: startDate, endDate: endDate };
}

const DATE_PARAM_REGEX = /^\d{4}-\d{2}-\d{2}\|\d{4}-\d{2}-\d{2}$/;

/**
 * Checks if the the filter by date parameters are valid.
 * @param dateRange A string that defines the date range.
 * @param datesParam A string that contains the custom date range, if relevant.
 * @returns A boolean; true if the params are valid, false if invalid.
 */
export function isValidParamDates(
  dateRange: string,
  datesParam: string | undefined,
): boolean {
  if (dateRange === CustomDateRangeOption) {
    return !!datesParam && DATE_PARAM_REGEX.test(datesParam);
  } else {
    return (<any>Object).values(DateRangeOptions).includes(dateRange);
  }
}

/**
 * Returns the date range period based on the provided search parameters.
 * @param searchParams - The current search parameters.
 * @returns The date range period object derived from the search parameters.
 */
export function returnParamDates(searchParams: {
  [key: string]: string | string[] | undefined;
}): DateRangePeriod {
  const dateRange = (searchParams?.dateRange as string) || DEFAULT_DATE_RANGE;
  const datesParam = searchParams?.dates as string | undefined;
  if (!isValidParamDates(dateRange, datesParam))
    return convertDateOptionToDateRange(DEFAULT_DATE_RANGE);
  if (dateRange === CustomDateRangeOption) {
    return buildCustomDateRange(datesParam as string);
  } else {
    return convertDateOptionToDateRange(dateRange);
  }
}
