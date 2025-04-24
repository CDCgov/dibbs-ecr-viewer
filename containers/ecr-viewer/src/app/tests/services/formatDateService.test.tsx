import {
  formatDate,
  formatDateTime,
  formatPeriodDate,
  formatPeriodDateTime,
  formatStartEndDate,
  formatStartEndDateTime,
} from "@/app/services/formatDateService";

describe("FormatDateService tests", () => {
  describe("formatDateTime", () => {
    it("Given an ISO date time string, should return the correct formatted date and time", () => {
      const inputDate = "2022-10-11T19:29:00Z";
      const expectedDate = "10/11/2022 3:29\u00A0PM\u00A0EDT";

      const result = formatDateTime(inputDate);
      expect(result).toEqual(expectedDate);
    });

    it("Given an ISO date time string with a UTC offset, should return the correct formatted date and time", () => {
      const inputDate = "2022-12-23T14:59:44-08:00";
      const expectedDate = "12/23/2022 5:59\u00A0PM\u00A0EST";

      const result = formatDateTime(inputDate);
      expect(result).toEqual(expectedDate);
    });

    it("Given an ISO date time string with no offset, should return the correct formatted date and time", () => {
      const inputDate = "2022-12-23T14:59:44";
      const expectedDate = "12/23/2022 2:59\u00A0PM";

      const result = formatDateTime(inputDate);
      expect(result).toEqual(expectedDate);
    });

    it("Given an ISO date string, should return the correct formatted date", () => {
      const inputDate = "2022-10-11";
      const expectedDate = "10/11/2022";

      const result = formatDateTime(inputDate);
      expect(result).toEqual(expectedDate);
    });

    it("Given a date time in the format of 'MM/DD/YYYY HH:MM AM/PM Z.' (as found in Lab Info Analysis Time), should return the correct formatted date", () => {
      const inputDate = "10/19/2022 10:00 AM PDT";
      const expectedDate = "10/19/2022 1:00\u00A0PM\u00A0EDT";

      const result = formatDateTime(inputDate);
      expect(result).toEqual(expectedDate);
    });

    it("Given an numeric time stamp, should return the correct formatted date time", () => {
      const inputDate = "20221011123456-0600";
      const expectedDate = "10/11/2022 2:34\u00A0PM\u00A0EDT";

      const result = formatDateTime(inputDate);
      expect(result).toEqual(expectedDate);
    });

    it("Given an numeric date stamp, should return the correct formatted date", () => {
      const inputDate = "20221011";
      const expectedDate = "10/11/2022";

      const result = formatDateTime(inputDate);
      expect(result).toEqual(expectedDate);
    });

    it("Given an invalid date string, should return as is", () => {
      const invalidDateString = "abcd-10-10T12:00:00Z";

      expect(formatDateTime(invalidDateString)).toEqual(invalidDateString);
    });

    it("Should convert to local time correctly for dates in daylight saving time and standard time", () => {
      // Date in Daylight Savings Time
      const inputDaylightSavingTime = "2024-04-01T12:00:00Z";
      const expectedDaylightSavingTime = "04/01/2024 8:00\u00A0AM\u00A0EDT";
      const resultDaylightSavingTime = formatDateTime(inputDaylightSavingTime);
      expect(resultDaylightSavingTime).toEqual(expectedDaylightSavingTime);

      // Date in Standard Time
      const inputStandardTime = "2023-12-01T12:00:00Z";
      const expectedStandardTime = "12/01/2023 7:00\u00A0AM\u00A0EST";
      const resultStandardTime = formatDateTime(inputStandardTime);
      expect(resultStandardTime).toEqual(expectedStandardTime);
    });
  });

  describe("Format Date", () => {
    it("should return the correct formatted date", () => {
      const inputDate = "2023-01-15";
      const expectedDate = "01/15/2023";

      const result = formatDate(inputDate);
      expect(result).toEqual(expectedDate);
    });

    it("should return N/A if provided date is an empty string", () => {
      const inputDate = "";

      const result = formatDate(inputDate);
      expect(result).toBeUndefined();
    });

    it("should return N/A if provided date is undefined", () => {
      const inputDate = undefined;

      const result = formatDate(inputDate as any);
      expect(result).toBeUndefined();
    });

    it("should return N/A if provided date is null", () => {
      const inputDate = null;

      const result = formatDate(inputDate as any);
      expect(result).toBeUndefined();
    });

    it("should return N/A if provided date is nonsense", () => {
      const inputDate = "hiiiiiii";

      const result = formatDate(inputDate as any);
      expect(result).toBeUndefined();
    });

    it("when given yyyymmdd, should return the correct formatted date", () => {
      const inputDate = "20220125";
      const expectedDate = "01/25/2022";

      const result = formatDate(inputDate);
      expect(result).toEqual(expectedDate);
    });
  });

  describe("formatStartEnd", () => {
    const dt = "2023-01-04T12:34";
    it("should return nothing when given nothing", () => {
      expect(formatStartEndDate({})).toEqual("");
      expect(formatStartEndDateTime({})).toEqual("");
    });

    it("should return start when given start", () => {
      expect(formatStartEndDate({ start: dt })).toEqual("Start: 01/04/2023");
      expect(formatStartEndDateTime({ start: dt })).toEqual(
        "Start: 01/04/2023 12:34\u00A0PM",
      );
    });

    it("should return end when given end", () => {
      expect(formatStartEndDate({ end: dt })).toEqual("End: 01/04/2023");
      expect(formatStartEndDateTime({ end: dt })).toEqual(
        "End: 01/04/2023 12:34\u00A0PM",
      );
    });

    it("should return start and end when given both", () => {
      expect(formatStartEndDate({ start: dt, end: dt })).toEqual(
        "Start: 01/04/2023\nEnd: 01/04/2023",
      );
      expect(formatStartEndDateTime({ start: dt, end: dt })).toEqual(
        "Start: 01/04/2023 12:34\u00A0PM\nEnd: 01/04/2023 12:34\u00A0PM",
      );
    });
  });

  describe("formatPeriod", () => {
    const dt = "2023-01-04T12:34";
    it("should return nothing when given nothing", () => {
      expect(formatPeriodDate({})).toEqual("");
      expect(formatPeriodDateTime({})).toEqual("");
    });

    it("should return start when given start", () => {
      expect(formatPeriodDate({ start: dt })).toEqual("01/04/2023 - Present");
      expect(formatPeriodDateTime({ start: dt })).toEqual(
        "01/04/2023 12:34\u00A0PM - Present",
      );
    });

    it("should return end when given end", () => {
      expect(formatPeriodDate({ end: dt })).toEqual("Unknown - 01/04/2023");
      expect(formatPeriodDateTime({ end: dt })).toEqual(
        "Unknown - 01/04/2023 12:34\u00A0PM",
      );
    });

    it("should return start and end when given both", () => {
      expect(formatPeriodDate({ start: dt, end: dt })).toEqual(
        "01/04/2023 - 01/04/2023",
      );
      expect(formatPeriodDateTime({ start: dt, end: dt })).toEqual(
        "01/04/2023 12:34\u00A0PM - 01/04/2023 12:34\u00A0PM",
      );
    });
  });
});
