"use client";

import { useSyncExternalStore } from "react";

import {
  formatDateTime,
  parseDateTime,
} from "@/app/services/formatDateService";

import styles from "./LocalDateTime.module.scss";

// Keep the server and hydration output consistent before using the browser's timezone.
// Components mounted after hydration can display local time immediately.
const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

// Allow a line break before the timezone without changing the displayed text.
const withTimeZoneBreak = (formatted = "") => {
  const zoneStart = formatted.search(/\u00a0(?=[A-Z]{3})/);
  if (zoneStart < 0) return formatted;
  return (
    <>
      {formatted.slice(0, zoneStart + 1)}
      <wbr />
      {formatted.slice(zoneStart + 1)}
    </>
  );
};

/**
 * Display a date and time in the browser's timezone.
 * Reserve space until hydration so the surrounding content does not move.
 * @param root0 Component properties.
 * @param root0.value Date or timestamp to display.
 * @returns A time element showing the local date, original text, or a dash for missing values.
 */
export function LocalDateTime({ value }: { value?: string }) {
  const mounted = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );
  // Show missing values and unrecognized text immediately.
  if (!value || Number.isNaN(parseDateTime(value).getTime()))
    return <time dateTime={value}>{formatDateTime(value) || "—"}</time>;
  const hasTime =
    value.includes(":") || /^\d{8}(?:\d{2}){1,3}(?:[+-]\d{4})?$/.test(value);

  return (
    <time
      dateTime={value}
      className={
        hasTime ? styles.dateTime : `${styles.dateTime} ${styles.dateOnly}`
      }
      aria-busy={!mounted}
    >
      <span className={styles.value}>
        {mounted ? (
          withTimeZoneBreak(formatDateTime(value))
        ) : (
          <span className="usa-sr-only">
            {hasTime ? "Loading date and time" : "Loading date"}
          </span>
        )}
      </span>
    </time>
  );
}

/**
 * Display a related report's date and time in the browser's timezone.
 * Bold the time when both reports fall on the same local calendar day.
 * @param root0 Component properties.
 * @param root0.value Related report timestamp to display.
 * @param root0.mainValue Main report timestamp to compare against.
 * @returns A time element with space reserved until the browser formats it.
 */
export function LocalRelatedDateTime({
  value,
  mainValue,
}: {
  value: string;
  mainValue: string;
}) {
  const mounted = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );
  const [date, time] = mounted ? formatDateTime(value).split(" ") : [];
  const [mainDate] = mounted ? formatDateTime(mainValue).split(" ") : [];
  return (
    <time
      dateTime={value}
      className={`${styles.dateTime} ${styles.related}`}
      aria-busy={!mounted}
    >
      <span className={styles.value}>
        {mounted ? (
          <>
            {date === mainDate ? (
              <strong>{withTimeZoneBreak(time)}</strong>
            ) : (
              withTimeZoneBreak(time)
            )}{" "}
            {date}
          </>
        ) : (
          <span className="usa-sr-only">Loading date and time</span>
        )}
      </span>
    </time>
  );
}
