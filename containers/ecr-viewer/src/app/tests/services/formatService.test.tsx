import {
  CodeableConcept,
  ContactPoint,
  HumanName,
  PatientContact,
} from "fhir/r4";

import {
  formatName,
  formatContactPoint,
  formatAddress,
  formatPhoneNumber,
  formatCurrentAddress,
  formatPatientContactList,
  formatCodeableConcept,
  formatAge,
} from "@/app/services/formatService";

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

  describe("Format age", () => {
    it("should only show days", () => {
      expect(formatAge({ years: 0, months: 0, days: 27 })).toEqual("27 days");
      expect(formatAge({ years: 0, months: 0, days: 31 })).toEqual("31 days");
      expect(formatAge({ years: 0, months: 0, days: 1 })).toEqual("1 day");
      expect(formatAge({ years: 0, months: 0, days: 0 })).toEqual("0 days");
    });

    it("should not return a plural unit if months/days equals 1", () => {
      expect(
        formatAge({
          years: 0,
          months: 1,
          days: 1,
        }),
      ).toEqual("1 month, 1 day");
    });

    it("should return a value in years if years is 2 or above", () => {
      expect(formatAge({ years: 2, months: 0, days: 0 })).toEqual("2 years");
      expect(formatAge({ years: 4, months: 6, days: 12 })).toEqual("4 years");
    });

    it("should return a value displaying months and days if years is under 2", () => {
      expect(
        formatAge({
          years: 1,
          months: 11,
          days: 29,
        }),
      ).toEqual("23 months, 29 days");

      expect(
        formatAge({
          years: 1,
          months: 0,
          days: 31,
        }),
      ).toEqual("12 months, 31 days");

      expect(
        formatAge({
          years: 1,
          months: 6,
          days: 1,
        }),
      ).toEqual("18 months, 1 day");
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
      expect(formatPhoneNumber("+11111111")).toBe("Invalid Number: +11111111");
      expect(formatPhoneNumber("+11111111111111111")).toBe(
        "Invalid Number: +11111111111111111",
      );
    });

    it("should format a valid phone number", () => {
      expect(formatPhoneNumber("+1 111 111 1111")).toBe("111-111-1111");
      expect(formatPhoneNumber("+11111111111")).toBe("111-111-1111");
      expect(formatPhoneNumber("1111111111")).toBe("111-111-1111");
      expect(formatPhoneNumber("111-111-1111")).toBe("111-111-1111");
      expect(formatPhoneNumber("(111) 111-1111")).toBe("111-111-1111");
      expect(formatPhoneNumber("(111) 111-1111x123")).toBe("111-111-1111 x123");
      expect(formatPhoneNumber("(111) 111-1111-x123")).toBe(
        "111-111-1111 x123",
      );
      expect(formatPhoneNumber("(111) 111-1111 x123")).toBe(
        "111-111-1111 x123",
      );
      expect(formatPhoneNumber("(111) 111-1111 ext123")).toBe(
        "111-111-1111 ext123",
      );
      expect(formatPhoneNumber("(111) 111-1111 ext 123")).toBe(
        "111-111-1111 ext123",
      );
      expect(formatPhoneNumber("(111) 111-1111 ext. 123")).toBe(
        "111-111-1111 ext123",
      );
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

  describe("formatCurrentAddress", () => {
    const base = {
      line: ["123 Main St"],
    };

    it("should return empty when no addresses available", () => {
      const actual = formatCurrentAddress([]);

      expect(actual).toEqual("");
    });

    it("should return first address when no use or period", () => {
      const actual = formatCurrentAddress([
        { ...base, city: "1" },
        { ...base, city: "2" },
      ]);

      expect(actual).toEqual("123 Main St\n1");
    });

    it("should return first home address when no current period", () => {
      const actual = formatCurrentAddress([
        { ...base, use: "work", city: "1" },
        { ...base, use: "home", city: "2" },
        { ...base, use: "home", city: "3" },
        {
          ...base,
          use: "home",
          city: "3",
          period: { start: "2020-03-01", end: "2020-04-01" },
        },
      ]);

      expect(actual).toEqual("123 Main St\n2");
    });

    it("should return current home address", () => {
      const actual = formatCurrentAddress([
        { ...base, use: "work", city: "1" },
        { ...base, use: "home", city: "2" },
        { ...base, use: "home", city: "3", period: { start: "2024-03-13" } },
        {
          ...base,
          use: "home",
          city: "4",
          period: { start: "2024-03-10", end: "2024-03-12" },
        },
      ]);

      expect(actual).toEqual("123 Main St\n3");
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

  describe("Format Patient Contact", () => {
    it("should format an emergency contact", () => {
      const contact: PatientContact[] = [
        {
          relationship: [
            {
              coding: [
                {
                  display: "sister",
                },
              ],
            },
          ],
          telecom: [
            {
              system: "phone",
              value: "+1-555-995-9999",
              use: "home",
            },
          ],
          name: {
            given: ["Anastasia", "Bubbletea"],
            family: "Pizza",
          },
          address: {
            use: "home",
            line: ["999 Single Court"],
            city: "BEVERLY HILLS",
            state: "CA",
            country: "USA",
            postalCode: "90210",
            district: "LOS ANGELE",
          },
        },
      ];
      const actual = formatPatientContactList(contact);
      expect(actual).toEqual(
        `Sister\nAnastasia Bubbletea Pizza\n999 Single Court\nBeverly Hills, CA\n90210, USA\nHome: 555-995-9999`,
      );
    });
    it("should return multiple emergency contacts", () => {
      const contact: PatientContact[] = [
        {
          relationship: [
            {
              coding: [
                {
                  display: "sister",
                },
              ],
            },
          ],
          telecom: [
            {
              system: "phone",
              value: "+1-555-995-9999",
              use: "home",
            },
          ],
          name: {
            given: ["Anastasia", "Bubbletea"],
            family: "Pizza",
          },
          address: {
            use: "home",
            line: ["999 Single Court"],
            city: "BEVERLY HILLS",
            state: "CA",
            country: "USA",
            postalCode: "90210",
            district: "LOS ANGELE",
          },
        },
        {
          relationship: [
            {
              coding: [
                {
                  display: "brother",
                },
              ],
            },
          ],
          name: {
            given: ["Alberto", "Bonanza", "Bartholomew"],
            family: "Eggbert",
          },
          telecom: [
            {
              system: "phone",
              value: "+1-555-995-1000",
              use: "home",
            },
            {
              system: "fax",
              value: "+1-555-995-1001",
              use: "home",
            },
          ],
        },
      ];
      const actual = formatPatientContactList(contact);
      expect(actual).toEqual(
        `Sister\nAnastasia Bubbletea Pizza\n999 Single Court\nBeverly Hills, CA\n90210, USA\nHome: 555-995-9999\n\nBrother\nAlberto Bonanza Bartholomew Eggbert\nHome: 555-995-1000\nHome Fax: 555-995-1001`,
      );
    });
    it("should not return empty space when address is not available in", () => {
      const contact: PatientContact[] = [
        {
          relationship: [
            {
              coding: [
                {
                  display: "sister",
                },
              ],
            },
          ],
          name: {
            given: ["Anastasia", "Bubbletea"],
            family: "Pizza",
          },
          telecom: [
            {
              system: "phone",
              value: "+1-555-995-9999",
              use: "home",
            },
          ],
        },
      ];
      const actual = formatPatientContactList(contact);
      expect(actual).toEqual(
        `Sister\nAnastasia Bubbletea Pizza\nHome: 555-995-9999`,
      );
    });
    // TODO PR: Add tests for RelatedPerson
    it("should return undefined if a patient has no contact", () => {
      const actual = formatPatientContactList([]);
      expect(actual).toBeUndefined();
    });
  });

  describe("Format CodeableConcept", () => {
    it("should return undefined if no coding is available", () => {
      const codeableConcept = undefined;

      const actual = formatCodeableConcept(codeableConcept);

      expect(actual).toBeUndefined();
    });

    it("should return the text value if available", () => {
      const textValue = "this is condition";
      const codeableConcept: CodeableConcept = {
        text: textValue,
        coding: [
          {
            display: "Condition",
            code: "64572001",
          },
        ],
      };

      const actual = formatCodeableConcept(codeableConcept);
      expect(actual).toEqual(textValue);
    });

    it("should return the first display value if there is no text value", () => {
      const correctDisplayValue = "Condition";
      const codeableConcept: CodeableConcept = {
        coding: [
          {
            display: "Condition",
            code: "64572001",
          },
          {
            display: "A Condition",
            code: "AC",
          },
        ],
      };

      const actual = formatCodeableConcept(codeableConcept);
      expect(actual).toEqual(correctDisplayValue);
    });

    it("should return the code and system of the first coding with both of them if there is no text or display value", () => {
      const codeValue = "64572001";
      const systemValue = "http://snomed.info/sct";
      const codeableConcept: CodeableConcept = {
        coding: [
          {
            code: "AC",
          },
          {
            code: codeValue,
            system: systemValue,
          },
        ],
      };

      const actual = formatCodeableConcept(codeableConcept);
      expect(actual).toEqual(`${codeValue} (${systemValue})`);
    });

    it("should return the code of the first first coding with a code if there is no text, display, or a code/system pair", () => {
      const codeValue = "64572001";
      const codeableConcept: CodeableConcept = {
        coding: [
          {
            code: codeValue,
          },
        ],
      };

      const actual = formatCodeableConcept(codeableConcept);
      expect(actual).toEqual(codeValue);
    });
  });
});
