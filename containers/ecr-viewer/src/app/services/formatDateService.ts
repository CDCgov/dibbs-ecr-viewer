// Determine if we can extract out the timezone part of the datetime string.
const hasTimeZoneString = (dateTimeString: string): boolean => {
  // Z
  if (dateTimeString.match(/[0-9]Z$/)) return true;

  // EDT, GMT-5, UTC+3
  if (
    dateTimeString
      .split(/\s/)
      .at(-1)
      ?.match(/^[A-Z]{3,}/)
  )
    return true;

  // +/-nn[:?[nn]]
  if (dateTimeString.match(/[+-]\d{1,2}:?\d{2}$/)) return true;

  return false;
};

// yyyymmdd[hhmmss][+-zzzz] to ISO
const reformatNumericTimestampToISO = (dateTimeString: string) => {
  // datetime is 20240101[1234][56][-0400] style
  const parts = dateTimeString.match(
    /(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?([+-]\d{4})?/,
  );
  // The regex didn't consume everything
  if (!parts) {
    return dateTimeString;
  }
  const dateParts = parts.slice(1, 4);
  const timeParts = parts.slice(4, 7).filter(Boolean);
  const tzPart = parts.at(-1);

  let newDateStr = dateParts.join("-");
  if (timeParts.length > 0) {
    newDateStr += "T";
    newDateStr += timeParts.join(":");
  }
  if (tzPart) {
    newDateStr += tzPart;
  }
  return newDateStr;
};

/**
 * Format a datetime string to "MM/DD/YYYY HH:MM AM/PM Z" where "Z" is the timezone abbreviation.If
 * the input string contains a UTC offset then the returned string will be in the format
 * "MM/DD/YYYY HH:MM AM/PM ZZZ". If there is no timezone indicated on the input date string, none will
 * be returned on the output. If the input string do not contain a time part, the returned
 * string will be in the format "MM/DD/YYYY". If the input string is not in the expected format, it
 * will be returned as is. If the input is falsy a blank string will be returned. The following
 * formats are supported:
 * - "YYYY-MM-DDTHH:MM±HH:MM"
 * - "YYYY-MM-DDTHH:MMZ"
 * - "YYYY-MM-DD"
 * - "MM/DD/YYYY HH:MM AM/PM ±HH:MM"
 * - "YYYYMMDDHHMMSS±HHMM"
 * @param dateTimeString datetime string.
 * @returns Formatted datetime string.
 */
export const formatDateTime = (dateTimeString: string | undefined): string => {
  if (!dateTimeString) {
    return "";
  }

  const date = new Date(dateTimeString);
  if (date.toString() === "Invalid Date") {
    // datetime is 20240101[1234][56][-0400] style?
    const newDateStr = reformatNumericTimestampToISO(dateTimeString);
    if (newDateStr !== dateTimeString) {
      return formatDateTime(newDateStr);
    }

    // If we are unable to format the date, return as is
    return dateTimeString;
  }

  // time as 00:00[:000]
  const hasTime = dateTimeString.includes(":");
  if (!hasTime) {
    return formatDate(dateTimeString) || dateTimeString;
  }

  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  };
  const formatted = (date as unknown as Date)
    .toLocaleDateString("en-Us", options)
    .replace(",", "");

  // Not actually time zoned
  if (!hasTimeZoneString(dateTimeString)) {
    return formatted.slice(0, formatted.lastIndexOf(" ")); // lop off " EDT"
  }

  // encourage word wrapping between date and time instead of wherever
  const parts = formatted.split(" ");
  return `${parts[0]} ${parts.slice(1).join("\u00A0")}`;
};

/**
 * Formats the provided date string into a formatted date string with year, month, and day.
 * @param dateString - The date string to be formatted. formatDate will also be able to take 'yyyymmdd' as input
 * @returns - The formatted date string, "Invalid Date" if input date was invalid, or undefined if the input date is falsy.
 */
export const formatDate = (dateString?: string): string | undefined => {
  if (dateString) {
    let date = new Date(dateString);

    if (date.toString() === "Invalid Date") {
      const newDateStr = reformatNumericTimestampToISO(dateString);
      if (newDateStr !== dateString) {
        return formatDate(newDateStr);
      }

      return undefined;
    }

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "UTC",
    }); // UTC, otherwise will have timezone issues
  }
};

/**
 * Formats the provided start and end date-time strings and returns a formatted string
 * with both the start and end times. Each time is labeled and separated by a carriage return
 * and newline for clarity in display or further processing.
 * @param startDateTime - The start date-time string to be formatted.
 * @param endDateTime - The end date-time string to be formatted.
 * @returns A string with the formatted start and end times, each on a new line.
 */
export const formatStartEndDateTime = (
  startDateTime: string | undefined,
  endDateTime: string | undefined,
) => formatStartEnd(startDateTime, endDateTime, formatDateTime);

/**
 * Formats the provided start and end date strings and returns a formatted string
 * with both the start and end dates. Each date is labeled and separated by a carriage return
 * and newline for clarity in display or further processing.
 * @param startDate - The start date-time string to be formatted.
 * @param endDate - The end date-time string to be formatted.
 * @returns A string with the formatted start and end times, each on a new line.
 */
export const formatStartEndDate = (
  startDate: string | undefined,
  endDate: string | undefined,
) => formatStartEnd(startDate, endDate, formatDate);

const formatStartEnd = (
  start: string | undefined,
  end: string | undefined,
  formatFn: (dt: string | undefined) => string | undefined,
) => {
  const textArray: String[] = [];

  const startDateObject = formatFn(start);
  const endDateObject = formatFn(end);

  if (startDateObject) {
    textArray.push(`Start: ${startDateObject}`);
  }
  if (endDateObject) {
    textArray.push(`End: ${endDateObject}`);
  }

  return textArray.join("\n");
};
