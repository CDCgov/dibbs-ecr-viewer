import { render } from "@testing-library/react";

import {
  formatDateTimeDisplay,
  formatStartEndDateTimeDisplay,
} from "@/app/services/dateTimeDisplay";

describe("formatDateTimeDisplay", () => {
  it.each([undefined, ""])("returns an empty string for %p", (value) => {
    expect(formatDateTimeDisplay(value)).toBe("");
  });

  it.each([
    ["2026", "01/01/2026"],
    ["2026-07", "07/01/2026"],
    ["2026-07-01", "07/01/2026"],
    ["20260701", "07/01/2026"],
    ["7/25/22", "07/25/2022"],
    ["07/25/2022", "07/25/2022"],
    ["2024-02-29", "02/29/2024"],
  ])("returns a formatted string for calendar date %s", (value, expected) => {
    expect(formatDateTimeDisplay(value)).toBe(expected);
  });

  it.each([
    "Unknown",
    "2026-99-99T12:00:00Z",
  ])("returns unrecognized date text unchanged: %p", (value) => {
    expect(formatDateTimeDisplay(value)).toBe(value);
  });
});

describe("formatStartEndDateTimeDisplay", () => {
  it.each([undefined, {}, { start: "", end: "" }])(
    "returns an empty string when both dates are missing: %p",
    (period) => {
      expect(formatStartEndDateTimeDisplay(period)).toBe("");
    },
  );

  it("displays labeled local dates and times on separate lines", () => {
    const period = {
      start: "2026-01-01T15:00:00Z",
      end: "2026-07-01T18:30:00+03:00",
    };
    const { container } = render(formatStartEndDateTimeDisplay(period));

    expect(container.textContent).toBe(
      "Start: 01/01/2026 10:00\u00a0AM\u00a0EST\nEnd: 07/01/2026 11:30\u00a0AM\u00a0EDT",
    );
    const timestamps = container.querySelectorAll("time");
    expect(timestamps).toHaveLength(2);
    expect(timestamps[0]).toHaveAttribute("datetime", period.start);
    expect(timestamps[1]).toHaveAttribute("datetime", period.end);
  });

  it.each([
    { period: { start: "2026-07-02T02:00:00Z" }, label: "Start" },
    { period: { end: "2026-07-02T02:00:00Z" }, label: "End" },
    {
      period: { start: "2026-07-02T02:00:00Z", aqswwqend: "" },
      label: "Start",
    },
    { period: { start: "", end: "2026-07-02T02:00:00Z" }, label: "End" },
  ])(
    "displays only $label when the other date is missing: $period",
    ({ period, label }) => {
      const { container } = render(formatStartEndDateTimeDisplay(period));

      expect(container.textContent).toBe(
        `${label}: 07/01/2026 10:00\u00a0PM\u00a0EDT`,
      );
      expect(container.querySelectorAll("time")).toHaveLength(1);
    },
  );
});
