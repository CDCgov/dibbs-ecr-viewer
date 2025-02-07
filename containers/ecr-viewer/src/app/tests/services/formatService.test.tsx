import {
  formatName,
  formatDate,
  toKebabCase,
  extractNumbersAndPeriods,
  formatTablesToJSON,
  toSentenceCase,
  removeHtmlElements,
  formatDateTime,
  formatVitals,
  formatContactPoint,
  getDataId,
  getFirstNonCommentChild,
  formatAddress,
  formatPhoneNumber,
  toTitleCase,
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

  describe("toKebabCase", () => {
    it("should convert string to lowercase", () => {
      expect(toKebabCase("HELLO")).toBe("hello");
    });

    it("should replace spaces with hyphens", () => {
      expect(toKebabCase("hello world")).toBe("hello-world");
    });

    it("should remove special characters", () => {
      expect(toKebabCase("Hello@World!")).toBe("helloworld");
    });
  });

  describe("formatTablesToJSON", () => {
    describe("return JSON object given an HTML string", () => {
      it("<li data-id><table /></li>", () => {
        const htmlString =
          "<li data-id='Result.12345'>Lab Test<table><thead><tr><th>Component</th><th>Analysis Time</th></tr></thead><tbody><tr data-id='Result.12345.Comp1'><td data-id='Result.12345.Comp1Name'>Campylobacter, NAAT</td><td>01/01/2024 1:00 PM PDT</td></tr><tr data-id='Result.12345.Comp2'><td data-id='Result.12345.Comp2Name'>Salmonella, NAAT</td><td>01/01/2024 1:00 PM PDT</td></tr></tbody></table><table><thead><tr><th>Specimen (Source)</th><th>Collection Time</th><th>Received Time</th></tr></thead><tbody><tr><td data-id='Result.12345.Specimen'>Stool</td><td>01/01/2024 12:00 PM PDT</td><td>01/01/2024 12:00 PM PDT</td></tr></tbody></table></li>";
        const expectedResult = [
          {
            resultId: "Result.12345",
            resultName: "Lab Test",
            tables: [
              [
                {
                  Component: {
                    value: "Campylobacter, NAAT",
                    metadata: {
                      "data-id": "Result.12345.Comp1Name",
                    },
                  },
                  "Analysis Time": {
                    value: "01/01/2024 3:00\u00A0PM\u00A0EST",
                    metadata: {},
                  },
                },
                {
                  Component: {
                    value: "Salmonella, NAAT",
                    metadata: {
                      "data-id": "Result.12345.Comp2Name",
                    },
                  },
                  "Analysis Time": {
                    value: "01/01/2024 3:00\u00A0PM\u00A0EST",
                    metadata: {},
                  },
                },
              ],
              [
                {
                  "Specimen (Source)": {
                    value: "Stool",
                    metadata: {
                      "data-id": "Result.12345.Specimen",
                    },
                  },
                  "Collection Time": {
                    value: "01/01/2024 2:00\u00A0PM\u00A0EST",
                    metadata: {},
                  },
                  "Received Time": {
                    value: "01/01/2024 2:00\u00A0PM\u00A0EST",
                    metadata: {},
                  },
                },
              ],
            ],
          },
        ];

        const result = formatTablesToJSON(htmlString);

        expect(result).toEqual(expectedResult);
      });

      it("<li ID><table /></li>", () => {
        const htmlString =
          "<li ID='Result.12345'>Lab Test<table><thead><tr><th>Component</th><th>Analysis Time</th></tr></thead><tbody><tr ID='Result.12345.Comp1'><td ID='Result.12345.Comp1Name'>Campylobacter, NAAT</td><td>01/01/2024 1:00 PM PDT</td></tr><tr ID='Result.12345.Comp2'><td ID='Result.12345.Comp2Name'>Salmonella, NAAT</td><td>01/01/2024 1:00 PM PDT</td></tr></tbody></table><table><thead><tr><th>Specimen (Source)</th><th>Collection Time</th><th>Received Time</th></tr></thead><tbody><tr><td ID='Result.12345.Specimen'>Stool</td><td>01/01/2024 12:00 PM PDT</td><td>01/01/2024 12:00 PM PDT</td></tr></tbody></table></li>";
        const expectedResult = [
          {
            resultId: "Result.12345",
            resultName: "Lab Test",
            tables: [
              [
                {
                  Component: {
                    value: "Campylobacter, NAAT",
                    metadata: {
                      id: "Result.12345.Comp1Name",
                    },
                  },
                  "Analysis Time": {
                    value: "01/01/2024 3:00\u00A0PM\u00A0EST",
                    metadata: {},
                  },
                },
                {
                  Component: {
                    value: "Salmonella, NAAT",
                    metadata: {
                      id: "Result.12345.Comp2Name",
                    },
                  },
                  "Analysis Time": {
                    value: "01/01/2024 3:00\u00A0PM\u00A0EST",
                    metadata: {},
                  },
                },
              ],
              [
                {
                  "Specimen (Source)": {
                    value: "Stool",
                    metadata: {
                      id: "Result.12345.Specimen",
                    },
                  },
                  "Collection Time": {
                    value: "01/01/2024 2:00\u00A0PM\u00A0EST",
                    metadata: {},
                  },
                  "Received Time": {
                    value: "01/01/2024 2:00\u00A0PM\u00A0EST",
                    metadata: {},
                  },
                },
              ],
            ],
          },
        ];

        const result = formatTablesToJSON(htmlString);

        expect(result).toEqual(expectedResult);
      });

      it("<item data-id><table /></item>", () => {
        const htmlString =
          "<list><item data-id='Result.12345'>Lab Test<table><thead><tr><th>Component</th><th>Analysis Time</th></tr></thead><tbody><tr data-id='Result.12345.Comp1'><td data-id='Result.12345.Comp1Name'>Campylobacter, NAAT</td><td>01/01/2024 1:00 PM PDT</td></tr><tr data-id='Result.12345.Comp2'><td data-id='Result.12345.Comp2Name'>Salmonella, NAAT</td><td>01/01/2024 1:00 PM PDT</td></tr></tbody></table><table><thead><tr><th>Specimen (Source)</th><th>Collection Time</th><th>Received Time</th></tr></thead><tbody><tr><td data-id='Result.12345.Specimen'>Stool</td><td>01/01/2024 12:00 PM PDT</td><td>01/01/2024 12:00 PM PDT</td></tr></tbody></table></item></list>";
        const expectedResult = [
          {
            resultId: "Result.12345",
            resultName: "Lab Test",
            tables: [
              [
                {
                  Component: {
                    value: "Campylobacter, NAAT",
                    metadata: {
                      "data-id": "Result.12345.Comp1Name",
                    },
                  },
                  "Analysis Time": {
                    value: "01/01/2024 3:00\u00A0PM\u00A0EST",
                    metadata: {},
                  },
                },
                {
                  Component: {
                    value: "Salmonella, NAAT",
                    metadata: {
                      "data-id": "Result.12345.Comp2Name",
                    },
                  },
                  "Analysis Time": {
                    value: "01/01/2024 3:00\u00A0PM\u00A0EST",
                    metadata: {},
                  },
                },
              ],
              [
                {
                  "Specimen (Source)": {
                    value: "Stool",
                    metadata: {
                      "data-id": "Result.12345.Specimen",
                    },
                  },
                  "Collection Time": {
                    value: "01/01/2024 2:00\u00A0PM\u00A0EST",
                    metadata: {},
                  },
                  "Received Time": {
                    value: "01/01/2024 2:00\u00A0PM\u00A0EST",
                    metadata: {},
                  },
                },
              ],
            ],
          },
        ];

        const result = formatTablesToJSON(htmlString);

        expect(result).toEqual(expectedResult);
      });

      it("<item ID><table /></item>", () => {
        const htmlString =
          "<list><item ID='Result.12345'>Lab Test<table><thead><tr><th>Component</th><th>Analysis Time</th></tr></thead><tbody><tr ID='Result.12345.Comp1'><td ID='Result.12345.Comp1Name'>Campylobacter, NAAT</td><td>01/01/2024 1:00 PM PDT</td></tr><tr ID='Result.12345.Comp2'><td ID='Result.12345.Comp2Name'>Salmonella, NAAT</td><td>01/01/2024 1:00 PM PDT</td></tr></tbody></table><table><thead><tr><th>Specimen (Source)</th><th>Collection Time</th><th>Received Time</th></tr></thead><tbody><tr><td ID='Result.12345.Specimen'>Stool</td><td>01/01/2024 12:00 PM PDT</td><td>01/01/2024 12:00 PM PDT</td></tr></tbody></table></item></list>";
        const expectedResult = [
          {
            resultId: "Result.12345",
            resultName: "Lab Test",
            tables: [
              [
                {
                  Component: {
                    value: "Campylobacter, NAAT",
                    metadata: {
                      id: "Result.12345.Comp1Name",
                    },
                  },
                  "Analysis Time": {
                    value: "01/01/2024 3:00\u00A0PM\u00A0EST",
                    metadata: {},
                  },
                },
                {
                  Component: {
                    value: "Salmonella, NAAT",
                    metadata: {
                      id: "Result.12345.Comp2Name",
                    },
                  },
                  "Analysis Time": {
                    value: "01/01/2024 3:00\u00A0PM\u00A0EST",
                    metadata: {},
                  },
                },
              ],
              [
                {
                  "Specimen (Source)": {
                    value: "Stool",
                    metadata: {
                      id: "Result.12345.Specimen",
                    },
                  },
                  "Collection Time": {
                    value: "01/01/2024 2:00\u00A0PM\u00A0EST",
                    metadata: {},
                  },
                  "Received Time": {
                    value: "01/01/2024 2:00\u00A0PM\u00A0EST",
                    metadata: {},
                  },
                },
              ],
            ],
          },
        ];

        const result = formatTablesToJSON(htmlString);

        expect(result).toEqual(expectedResult);
      });

      it("<table><caption></table>", () => {
        const tableString =
          "<table><caption><content>Pending Results</content></caption><thead><tr><th>Name</th></tr></thead><tbody><tr data-id='procedure9'><td>test1</td></tr></tbody></table><table><caption>Scheduled Orders</caption></caption><thead><tr><th>Name</th></tr></thead><tbody><tr data-id='procedure10'><td>test2</td></tr></tbody></table>documented as of this encounter\n";
        const expectedResult = [
          {
            resultName: "Pending Results",
            tables: [[{ Name: { metadata: {}, value: "test1" } }]],
          },
          {
            resultName: "Scheduled Orders",
            tables: [[{ Name: { metadata: {}, value: "test2" } }]],
          },
        ];
        const result = formatTablesToJSON(tableString);

        expect(result).toEqual(expectedResult);
      });

      it("<content>{name}</content><br/><table><caption>{name}</table> prefers caption", () => {
        const tableString =
          "<content>Empty Header</content><br /><content>Future Tests</content><br /><table><caption>Caption 1</caption><thead><tr><th>Name</th></tr></thead><tbody><tr data-id='procedure9'><td>test1</td></tr></tbody></table><content>Pending Tests</content><br /><table><caption>Caption 2</caption><thead><tr><th>Name</th></tr></thead><tbody><tr data-id='procedure9'><td>test2</td></tr></tbody></table>< /br><Content>Text Header><br/>No table here\n";
        const expectedResult = [
          {
            resultName: "Caption 1",
            tables: [[{ Name: { metadata: {}, value: "test1" } }]],
          },
          {
            resultName: "Caption 2",
            tables: [[{ Name: { metadata: {}, value: "test2" } }]],
          },
        ];
        const result = formatTablesToJSON(tableString);

        expect(result).toEqual(expectedResult);
      });
    });

    it("<content>{name}</content><br/><table/>", () => {
      const tableString =
        '<content>Empty Header</content><br /><content>Future Tests</content><br /><table><thead><tr><th>Name</th></tr></thead><tbody><tr data-id=\'procedure9\'><td>test1</td></tr></tbody></table><content>Pending Tests</content><br /><table><thead><tr><th>Name</th></tr></thead><tbody><tr data-id=\'procedure9\'><td>test2</td></tr></tbody></table>< /br><content>Text Header</content><br/>No table here<content styleCode="Bold" xmlns="urn:hl7-org:v3">Patient Instructions</content><br xmlns="urn:hl7-org:v3" /><table xmlns="urn:hl7-org:v3"><tbody><tr><td ID="potpatinstr-1">instruction</td></tr></tbody></table>';
      const expectedResult = [
        {
          resultName: "Future Tests",
          tables: [[{ Name: { metadata: {}, value: "test1" } }]],
        },
        {
          resultName: "Pending Tests",
          tables: [[{ Name: { metadata: {}, value: "test2" } }]],
        },
        {
          resultName: "Patient Instructions",
          tables: [
            [
              {
                "Unknown Header": {
                  metadata: { id: "potpatinstr-1" },
                  value: "instruction",
                },
              },
            ],
          ],
        },
      ];
      const result = formatTablesToJSON(tableString);

      expect(result).toEqual(expectedResult);
    });

    it("<content>{name}</content><br/><table/>", () => {
      const tableString =
        '<content>Empty Header</content><br /><content>Future Tests</content><br /><table><thead><tr><th>Name</th></tr></thead><tbody><tr data-id=\'procedure9\'><td>test1</td></tr></tbody></table><content>Pending Tests</content><br /><table><thead><tr><th>Name</th></tr></thead><tbody><tr data-id=\'procedure9\'><td>test2</td></tr></tbody></table>< /br><content>Text Header</content><br/>No table here<content styleCode="Bold" xmlns="urn:hl7-org:v3">Patient Instructions</content><br xmlns="urn:hl7-org:v3" /><table xmlns="urn:hl7-org:v3"><tbody><tr><td ID="potpatinstr-1">instruction</td></tr></tbody></table>';
      const expectedResult = [
        {
          resultName: "Future Tests",
          tables: [[{ Name: { metadata: {}, value: "test1" } }]],
        },
        {
          resultName: "Pending Tests",
          tables: [[{ Name: { metadata: {}, value: "test2" } }]],
        },
        {
          resultName: "Patient Instructions",
          tables: [
            [
              {
                "Unknown Header": {
                  metadata: { id: "potpatinstr-1" },
                  value: "instruction",
                },
              },
            ],
          ],
        },
      ];
      const result = formatTablesToJSON(tableString);

      expect(result).toEqual(expectedResult);
    });

    it("<table/>", () => {
      const tableString =
        "<table><thead><tr><th>Name</th></tr></thead><tbody><tr ID='lab9'><td>test1</td></tr></tbody></table><table><thead><tr><th>Name</th></tr></thead><tbody><tr ID='lab9'><td>test2</td></tr></tbody></table><table xmlns=\"urn:hl7-org:v3\"><tbody><tr><td ID=\"potpatinstr-1\">instruction</td></tr></tbody></table>";
      const expectedResult = [
        {
          resultId: undefined,
          resultName: "",
          tables: [[{ Name: { metadata: {}, value: "test1" } }]],
        },
        {
          resultId: undefined,
          resultName: "",
          tables: [[{ Name: { metadata: {}, value: "test2" } }]],
        },
        {
          resultId: undefined,
          resultName: "",
          tables: [
            [
              {
                "Unknown Header": {
                  metadata: { id: "potpatinstr-1" },
                  value: "instruction",
                },
              },
            ],
          ],
        },
      ];
      const result = formatTablesToJSON(tableString);

      expect(result).toEqual(expectedResult);
    });

    it("should return an empty array when HTML string input has no tables", () => {
      const htmlString =
        "<div><h1>Hello, World!</h1><p>This HTML string has no tables.</p></div>";
      const expectedResult: [] = [];

      const result = formatTablesToJSON(htmlString);

      expect(result).toEqual(expectedResult);
    });
  });

  describe("extractNumbersAndPeriods", () => {
    it("should return the correctly formatted sequence of numbers and periods", () => {
      const inputArray = [
        "#Result.1.2.840.114350.1.13.297.3.7.2.798268.1670845.Comp2",
        "#Result.1.2.840.114350.1.13.297.3.7.2.798268.1670844.Comp3",
      ];
      const expectedResult = [
        "1.2.840.114350.1.13.297.3.7.2.798268.1670845",
        "1.2.840.114350.1.13.297.3.7.2.798268.1670844",
      ];

      const result = extractNumbersAndPeriods(inputArray);
      expect(result).toEqual(expectedResult);
    });

    it("should return an empty string if no periods are found", () => {
      const inputArray = ["foo", "bar"];
      const expectedResult = ["", ""];

      const result = extractNumbersAndPeriods(inputArray);
      expect(result).toEqual(expectedResult);
    });

    it("should return an empty string if only one period is found", () => {
      const inputArray = ["foo.bar", "hello.there"];
      const expectedResult = ["", ""];

      const result = extractNumbersAndPeriods(inputArray);
      expect(result).toEqual(expectedResult);
    });
  });

  describe("toSentenceCase", () => {
    it("should return string in sentence case", () => {
      const input = "hello there";
      const expected = "Hello there";

      const result = toSentenceCase(input);
      expect(result).toEqual(expected);
    });
    it("should return undefined if string is empty", () => {
      const result = toSentenceCase(undefined);
      expect(result).toBeUndefined();
    });
  });

  describe("toTitleCase", () => {
    it("should return string in title case", () => {
      const input = "HAN SOLO";
      const expected = "Han Solo";

      const result = toTitleCase(input);
      expect(result).toEqual(expected);
    });
    it("should return single-character word in title case", () => {
      const input = "a";
      const expected = "A";

      const result = toTitleCase(input);
      expect(result).toEqual(expected);
    });
    it("should return multi-line string in title case", () => {
      const input = "facility name 1\nfacility name 2";
      const expected = "Facility Name 1\nFacility Name 2";

      const result = toTitleCase(input);
      expect(result).toEqual(expected);
    });
    it("should return undefined if string is empty", () => {
      const result = toTitleCase(undefined);
      expect(result).toBeUndefined();
    });
  });

  describe("removeHtmlElements", () => {
    it("should remove all HTML tags from string", () => {
      const input = "<div><p>Hello <br/>there</p></div>";
      const expected = "Hello there";

      const result = removeHtmlElements(input);
      expect(result).toEqual(expected);
    });
    it("should return the same string if no HTML tags are included", () => {
      const input = "Hello there";
      const expected = "Hello there";

      const result = removeHtmlElements(input);
      expect(result).toEqual(expected);
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

  describe("getDataId", () => {
    it("should return the correct data-id from an attribute", () => {
      const li = document.createElement("li");
      li.setAttribute("data-id", "attribute123");

      const result = getDataId(li);
      expect(result).toEqual("attribute123");
    });

    it("should return the id if there is one", () => {
      const li = document.createElement("li");
      li.setAttribute("ID", "id123");

      const result = getDataId(li);
      expect(result).toEqual("id123");
    });

    it("should return null if there is no id or data-id attribute", () => {
      const li = document.createElement("li");
      li.textContent = "No id or data-id attribute here";

      const result = getDataId(li);
      expect(result).toBeNull();
    });

    it("should return the correct data-id from a table element", () => {
      const table = document.createElement("table");
      table.setAttribute("data-id", "table123");

      const result = getDataId(table);
      expect(result).toEqual("table123");
    });
  });

  describe("getFirstNonCommentChild", () => {
    it("should return the first non-comment child node", () => {
      const li = document.createElement("li");
      const textNode = document.createTextNode("This is a text node");
      li.appendChild(document.createComment("This is a comment"));
      li.appendChild(textNode);
      li.appendChild(document.createElement("span"));

      const result = getFirstNonCommentChild(li);
      expect(result).toBe(textNode); // The text node should be returned
    });

    it("should return null if all child nodes are comments", () => {
      const li = document.createElement("li");
      li.appendChild(document.createComment("This is a comment"));
      li.appendChild(document.createComment("Another comment"));

      const result = getFirstNonCommentChild(li);
      expect(result).toBeNull(); // No non-comment node exists
    });

    it("should return the first element node if it is the first non-comment node", () => {
      const li = document.createElement("li");
      const span = document.createElement("span");
      li.appendChild(document.createComment("This is a comment"));
      li.appendChild(span);

      const result = getFirstNonCommentChild(li);
      expect(result).toBe(span); // The <span> element should be returned
    });

    it("should return null if there are no child nodes", () => {
      const li = document.createElement("li");

      const result = getFirstNonCommentChild(li);
      expect(result).toBeNull(); // No children present
    });

    it("should return the first non-comment node even if there are multiple child nodes", () => {
      const li = document.createElement("li");
      const div = document.createElement("div");
      li.appendChild(document.createComment("This is a comment"));
      li.appendChild(div);
      li.appendChild(document.createElement("span"));

      const result = getFirstNonCommentChild(li);
      expect(result).toBe(div); // The <div> should be returned, even with more children
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
