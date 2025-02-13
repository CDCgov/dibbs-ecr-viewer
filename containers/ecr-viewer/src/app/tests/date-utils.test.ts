import {
  DateRangeOptions,
  buildCustomDateRange,
  convertDateOptionToDateRange,
} from "@/app/utils/date-utils";

describe("convertDateOptionToDateRange", () => {
  const today = new Date("2024-04-02T12:34:01.009");

  it("should return last 24 hours range", () => {
    const expectedStart = new Date("2024-04-01T16:34:01.009Z");
    const { startDate, endDate } = convertDateOptionToDateRange(
      DateRangeOptions.Last24Hours,
      today,
    );

    expect(startDate).toEqual(expectedStart);
    expect(endDate).toEqual(today);
  });

  it("should return last 7 days range", () => {
    const expectedStart = new Date("2024-03-26T04:00:00.000Z");
    const { startDate, endDate } = convertDateOptionToDateRange(
      DateRangeOptions.Last7Days,
      today,
    );

    expect(startDate).toEqual(expectedStart);
    expect(endDate).toEqual(today);
  });

  it("should return last 30 days range", () => {
    const expectedStart = new Date("2024-03-03T05:00:00.000Z");
    const { startDate, endDate } = convertDateOptionToDateRange(
      DateRangeOptions.Last30Days,
      today,
    );

    expect(startDate).toEqual(expectedStart);
    expect(endDate).toEqual(today);
  });

  it("should return last 3 months range", () => {
    const expectedStart = new Date("2024-01-02T05:00:00.000Z");
    const { startDate, endDate } = convertDateOptionToDateRange(
      DateRangeOptions.Last3Months,
      today,
    );

    expect(startDate).toEqual(expectedStart);
    expect(endDate).toEqual(today);
  });

  it("should return last 6 months range", () => {
    const expectedStart = new Date("2023-10-02T04:00:00.000Z");
    const { startDate, endDate } = convertDateOptionToDateRange(
      DateRangeOptions.Last6Months,
      today,
    );

    expect(startDate).toEqual(expectedStart);
    expect(endDate).toEqual(today);
  });

  it("should return last year range", () => {
    const expectedStart = new Date("2023-04-02T04:00:00.000Z");
    const { startDate, endDate } = convertDateOptionToDateRange(
      DateRangeOptions.LastYear,
      today,
    );

    expect(startDate).toEqual(expectedStart);
    expect(endDate).toEqual(today);
  });

  it("should throw error for invalid filter option", () => {
    expect(() => {
      convertDateOptionToDateRange("invalid");
    }).toThrow("Invalid filter option");
  });

  it("should return last year range with leap year and February 29th", () => {
    const leapYearDay = new Date("2024-02-29T00:00:00.000Z");

    const { startDate, endDate } = convertDateOptionToDateRange(
      DateRangeOptions.LastYear,
      leapYearDay,
    );

    // Start date should be February 28th, 2023 (because 2023 was not a leap year)
    const expectedStart = new Date(2023, 1, 28, 0, 0, 0, 0);

    expect(startDate).toEqual(expectedStart);
    expect(endDate).toEqual(leapYearDay);
  });
});

describe("buildCustomDateRange", () => {
  it("should return the correct start and end date given the dates string", () => {
    const dates = "2025-01-10|2025-01-11";
    const expectedCustomDates = {
      startDate: new Date("2025-01-10T00:00:00"),
      endDate: new Date("2025-01-11T23:59:59.999"),
    };

    const result = buildCustomDateRange(dates);
    expect(result).toEqual(expectedCustomDates);
  });
});
