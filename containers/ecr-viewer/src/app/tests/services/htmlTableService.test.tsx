import parse, { HTMLElement, NodeType } from "node-html-parser";

import {
  formatTablesToJSON,
  getDataId,
  getFirstNonCommentChild,
} from "@/app/services/htmlTableService";

describe("htmlTableService tests", () => {
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
        "<list><item><caption>Caption A</caption><content><content><content>Content A</content><br />Content B</content><br /></content></item></list><footnote>Footnote</footnote>";
      const expectedResult: [] = [];

      const result = formatTablesToJSON(htmlString);

      expect(result).toEqual(expectedResult);
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
      const root = parse(
        "<li><!-- this is a comment --> a text node <span/></li>",
      );
      const li = root.childNodes[0] as HTMLElement;

      const result = getFirstNonCommentChild(li);
      expect(result?.nodeType).toBe(NodeType.TEXT_NODE); // The text node should be returned
    });

    it("should return null if all child nodes are comments", () => {
      const root = parse(
        "<li><!-- this is a comment --><!-- another comment --></li>",
      );
      const li = root.childNodes[0] as HTMLElement;

      const result = getFirstNonCommentChild(li);
      expect(result).toBeNull(); // No non-comment node exists
    });

    it("should return the first element node if it is the first non-comment node", () => {
      const root = parse("<li><!-- this is a comment --><span/></li>");
      const li = root.childNodes[0] as HTMLElement;

      const result = getFirstNonCommentChild(li);
      expect(result?.rawTagName).toBe("span"); // The <span> element should be returned
    });

    it("should return null if there are no child nodes", () => {
      const root = parse("<li/>");
      const li = root.childNodes[0] as HTMLElement;

      const result = getFirstNonCommentChild(li);
      expect(result).toBeNull(); // No children present
    });

    it("should return the first non-comment node even if there are multiple child nodes", () => {
      const root = parse("<li><!-- this is a comment --><div/><span/></li>");
      const li = root.childNodes[0] as HTMLElement;

      const result = getFirstNonCommentChild(li);
      expect(result?.rawTagName).toBe("div"); // The <div> should be returned, even with more children
    });
  });
});
