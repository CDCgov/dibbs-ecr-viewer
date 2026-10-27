import { LocalDateTime } from "@/app/components/LocalDateTime";

import { formatDateTime } from "./formatDateService";

/**
 * Prepare a value for display, formatting timestamps in the browser.
 * @param value Date, timestamp, or fallback text to display.
 * @returns A formatted calendar date, unchanged text, a local datetime component, or an empty string.
 */
export const formatDateTimeDisplay = (value?: string) => {
  if (!value) return "";

  // Dates without a time keep their calendar day and can be formatted on the server.
  if (
    /^(?:\d{4}(?:-\d{2}(?:-\d{2})?)?|\d{8}|\d{1,2}\/\d{1,2}\/\d{2}(?:\d{2})?)$/.test(
      value,
    )
  ) {
    return formatDateTime(value);
  }

  // Return text such as "Unknown" unchanged so availability checks still work.
  // Numeric HL7 timestamps are handled by the browser formatter.
  if (
    Number.isNaN(Date.parse(value)) &&
    !/^\d{8}(?:\d{2}){1,3}(?:[+-]\d{4})?$/.test(value)
  )
{
    return value;
}
  return <LocalDateTime value={value} />;
};

/**
 * Display a period with "Start:" and "End:" labels, omitting missing dates.
 * Timestamps are formatted in the browser's timezone.
 * @param root0 Period to display.
 * @param root0.start Start date or timestamp.
 * @param root0.end End date or timestamp.
 * @returns The labeled dates separated by a newline, or an empty string when both are missing.
 */
export const formatStartEndDateTimeDisplay = ({
  start,
  end,
}: { start?: string; end?: string } = {}) => {
  if (!start && !end) return "";
  return (
    <>
      {start && <>Start: {formatDateTimeDisplay(start)}</>}
      {start && end && "\n"}
      {end && <>End: {formatDateTimeDisplay(end)}</>}
    </>
  );
};
