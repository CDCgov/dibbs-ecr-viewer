import {
  formatName,
  formatVitals,
  formatContactPoint,
  formatAddress,
  formatPhoneNumber,
} from "@/app/services/formatService";
import { ContactPoint, HumanName } from "fhir/r4";

describe("FormatService tests", () => {
  describe("Format Name", () => {
    const inputHumanName = {
      given: ["Gregory", "B"],
      family: "House",
    } as HumanName;

    it("should return only given and family name", () => {
      const expectedName = "Gregory B House";

      const result = formatName(inputHumanName);
      expect(result).toEqual(expectedName);
    });

    it("should return the prefix, given, family, and suffix names", () => {
      const expectedName = "Dr. Gregory B House III";

      inputHumanName.prefix = ["Dr."];
      inputHumanName.suffix = ["III"];

      const result = formatName(inputHumanName);
      expect(result).toEqual(expectedName);
    });

    it("should return an empty string", () => {
      const emptyHumanName = {
        given: [],
        family: "",
        prefix: [],
        suffix: [],
      } as HumanName;
      const expectedName = "";

      const result = formatName(emptyHumanName);
      expect(result).toEqual(expectedName);
    });
  });

  describe("formatVitals", () => {
    test("formats height, weight, and BMI correctly when all parameters are provided", () => {
      const result = formatVitals(
        "65",
        "[in_i]",
        "150",
        "[lb_av]",
        "25",
        "kg/m2",
      );
      expect(result).toEqual({
        height: "65 in",
        weight: "150 lb",
        bmi: "25 kg/m2",
      });
    });

    test("returns empty strings for missing parameters", () => {
      const resultNoHeight = formatVitals(
        "",
        "",
        "150",
        "[lb_av]",
        "25",
        "kg/m2",
      );
      expect(resultNoHeight).toEqual({
        height: "",
        weight: "150 lb",
        bmi: "25 kg/m2",
      });

      const resultNoWeight = formatVitals(
        "65",
        "[in_i]",
        "",
        "",
        "25",
        "kg/m2",
      );
      expect(resultNoWeight).toEqual({
        height: "65 in",
        weight: "",
        bmi: "25 kg/m2",
      });

      const resultNoBmi = formatVitals(
        "65",
        "[in_i]",
        "150",
        "[lb_av]",
        "",
        "",
      );
      expect(resultNoBmi).toEqual({
        height: "65 in",
        weight: "150 lb",
        bmi: "",
      });
    });
  });

  describe("formatContactPoint", () => {
    it("should return empty string if contact points is null", () => {
      const actual = formatContactPoint(undefined);
      expect(actual).toBe("");
    });
    it("should return empty string if contact points is contact points is empty", () => {
      const actual = formatContactPoint([]);
      expect(actual).toBe("");
    });
    it("should return empty string if contact point value is empty ", () => {
      const contactPoints: ContactPoint[] = [
        {
          system: "phone",
          value: "",
        },
        {
          system: "email",
          value: "",
        },
      ];
      const actual = formatContactPoint(contactPoints);
      expect(actual).toBe("");
    });
    it("should return phone contact information ", () => {
      const contactPoints: ContactPoint[] = [
        {
          system: "phone",
          value: "+15555551234",
          use: "work",
        },
        {
          system: "phone",
          value: "+15555551234",
        },
      ];
      const actual = formatContactPoint(contactPoints);
      expect(actual).toEqual("Work: 555-555-1234\n555-555-1234");
    });
    it("should return email information ", () => {
      const contactPoints: ContactPoint[] = [
        {
          system: "email",
          value: "me@example.com",
          use: "work",
        },
        {
          system: "email",
          value: "medicine@example.com",
        },
      ];
      const actual = formatContactPoint(contactPoints);
      expect(actual).toEqual("me@example.com\nmedicine@example.com");
    });
    it("should return fax information ", () => {
      const contactPoints: ContactPoint[] = [
        {
          system: "fax",
          value: "+15555551234",
          use: "work",
        },
        {
          system: "fax",
          value: "+1 555 555-1235",
        },
      ];
      const actual = formatContactPoint(contactPoints);
      expect(actual).toEqual("Work Fax: 555-555-1234\nFax: 555-555-1235");
    });
    it("should sort by system ", () => {
      const contactPoints: ContactPoint[] = [
        {
          system: "fax",
          value: "+15555551234",
          use: "work",
        },
        {
          system: "email",
          value: "medicine@example.com",
        },
        {
          system: "pager",
          value: "+1 555 555-1235",
        },
        {
          system: "phone",
          value: "+1 555 555-1236",
        },
        {
          system: "email",
          value: "medicine@example.com",
        },
        {
          system: "other",
          value: "123",
        },
      ];
      const actual = formatContactPoint(contactPoints);
      expect(actual).toEqual(
        "555-555-1236\nWork Fax: 555-555-1234\nPager: 555-555-1235\nmedicine@example.com\nmedicine@example.com\nOther: 123",
      );
    });
  });

  describe("formatPhoneNumber", () => {
    it("should return undefined when falsey things passed", () => {
      expect(formatPhoneNumber(null as unknown as string)).toBe(undefined);
    });

    it("should return undefined when empty things passed", () => {
      expect(formatPhoneNumber(" ")).toBe(undefined);
    });

    it("should return 'Invalid Number' when junk things passed", () => {
      expect(formatPhoneNumber("+11111111")).toBe("Invalid Number");
    });

    it("should format a valid phone number", () => {
      expect(formatPhoneNumber("+1 111 111 1111")).toBe("111-111-1111");
      expect(formatPhoneNumber("+11111111111")).toBe("111-111-1111");
      expect(formatPhoneNumber("1111111111")).toBe("111-111-1111");
      expect(formatPhoneNumber("111-111-1111")).toBe("111-111-1111");
      expect(formatPhoneNumber("(111) 111-1111")).toBe("111-111-1111");
    });
  });

  describe("Format address", () => {
    it("should format a full address", () => {
      const actual = formatAddress({
        line: ["123 maIn stREet", "unit 2"],
        city: "city",
        state: "ST",
        postalCode: "00000",
        country: "USA",
      });
      expect(actual).toEqual("123 Main Street\nUnit 2\nCity, ST\n00000, USA");
    });
    it("should skip undefined values", () => {
      const actual = formatAddress({
        line: ["123 Main street", "Unit 2"],
        state: "ST",
        postalCode: "00000",
        country: "USA",
      });
      expect(actual).toEqual("123 Main Street\nUnit 2\nST\n00000, USA");
    });

    it("should return empty string if no values are available", () => {
      const actual = formatAddress();

      expect(actual).toEqual("");
    });

    it("should skip extra address lines that are empty string", () => {
      const actual = formatAddress({
        line: ["Street 1", "", "Unit 3", "", "Floor 4"],
      });

      expect(actual).toEqual("Street 1\nUnit 3\nFloor 4");
    });

    it("should include the use, when asked for and available", () => {
      const actual = formatAddress(
        {
          line: ["123 Main street", "Unit 2"],
          city: "City",
          state: "ST",
          postalCode: "00000",
          country: "USA",
          use: "home",
        },
        { includeUse: true },
      );
      expect(actual).toEqual(
        "Home:\n123 Main Street\nUnit 2\nCity, ST\n00000, USA",
      );
    });

    it("should include the dates, when asked for and available", () => {
      const actual = formatAddress(
        {
          line: ["123 Main street", "Unit 2"],
          city: "City",
          state: "ST",
          postalCode: "00000",
          country: "USA",
          use: "home",
          period: { start: "03/13/2024", end: "04/14/2024" },
        },
        { includePeriod: true },
      );
      expect(actual).toEqual(
        "123 Main Street\nUnit 2\nCity, ST\n00000, USA\nDates: 03/13/2024 - 04/14/2024",
      );
    });

    it("should include the start date and present, when asked for and available", () => {
      const actual = formatAddress(
        {
          line: ["123 Main street", "Unit 2"],
          city: "City",
          state: "ST",
          postalCode: "00000",
          country: "USA",
          use: "home",
          period: { start: "03/13/2024" },
        },
        { includePeriod: true },
      );
      expect(actual).toEqual(
        "123 Main Street\nUnit 2\nCity, ST\n00000, USA\nDates: 03/13/2024 - Present",
      );
    });

    it("should include the end date and unknown, when asked for and available", () => {
      const actual = formatAddress(
        {
          line: ["123 Main street", "Unit 2"],
          city: "City",
          state: "ST",
          postalCode: "00000",
          country: "USA",
          use: "home",
          period: { end: "03/13/2024" },
        },
        { includePeriod: true },
      );
      expect(actual).toEqual(
        "123 Main Street\nUnit 2\nCity, ST\n00000, USA\nDates: Unknown - 03/13/2024",
      );
    });

    it("should not include the use or period, when not asked for and available", () => {
      const actual = formatAddress({
        line: ["123 Main street", "Unit 2"],
        city: "City",
        state: "ST",
        postalCode: "00000",
        country: "USA",
        use: "home",
        period: { start: "03/13/2024" },
      });
      expect(actual).toEqual("123 Main Street\nUnit 2\nCity, ST\n00000, USA");
    });
  });

  describe("Format phone number", () => {
    it("should return undefined when phone number is undefined", () => {
      const actual = formatPhoneNumber(undefined);

      expect(actual).toBeUndefined();
    });
    it("should remove all non string characters from the phone number", () => {
      const actual = formatPhoneNumber("++1555 123-4567");

      expect(actual).toEqual("555-123-4567");
    });

    it("should remove all extra digits from the phone number", () => {
      const actual = formatPhoneNumber("5551234567 +1");

      expect(actual).toEqual("555-123-4567");
    });
  });
});
