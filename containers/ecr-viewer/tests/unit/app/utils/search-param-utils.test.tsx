import {
  LIBRARY_SEARCH_PARAMS,
  LibraryParam,
} from "@/app/utils/search-param-utils";

describe("search param utils", () => {
  // Both use "isPositiveInt" helper
  const params: LibraryParam[] = ["itemsPerPage", "page"];
  params.map((param) =>
    describe(param, () => {
      const { validator } = LIBRARY_SEARCH_PARAMS[param];
      it("rejects a negative number", () => {
        const params = new URLSearchParams(`${param}=-1`);
        validator!(params);
        expect(params.toString()).toBe("");
      });
      it("rejects a zero number", () => {
        const params = new URLSearchParams(`${param}=0`);
        validator!(params);
        expect(params.toString()).toBe("");
      });
      it("accepts a positive number", () => {
        const params = new URLSearchParams(`${param}=3`);
        validator!(params);
        expect(params.toString()).toBe(`${param}=3`);
      });
      it("rejects a non-number", () => {
        const params = new URLSearchParams(`${param}=abc`);
        validator!(params);
        expect(params.toString()).toBe("");
      });
    }),
  );

  describe("columnId", () => {
    const { validator } = LIBRARY_SEARCH_PARAMS.columnId;
    it("accepts sortable headers", () => {
      const params = new URLSearchParams("columnId=date_created");
      validator!(params);
      expect(params.toString()).toBe("columnId=date_created");
    });
    it("rejects non-sortable headers", () => {
      const params = new URLSearchParams("columnId=rule_summary&direction=ASC");
      validator!(params);
      expect(params.toString()).toBe("");
    });
    it("rejects nonsense headers", () => {
      const params = new URLSearchParams("columnId=123");
      validator!(params);
      expect(params.toString()).toBe("");
    });
  });

  describe("direction", () => {
    const { validator } = LIBRARY_SEARCH_PARAMS.direction;
    it("accepts ASC", () => {
      const params = new URLSearchParams("direction=ASC");
      validator!(params);
      expect(params.toString()).toBe("direction=ASC");
    });
    it("accepts DESC", () => {
      const params = new URLSearchParams("direction=DESC");
      validator!(params);
      expect(params.toString()).toBe("direction=DESC");
    });
    it("rejects nonsense headers", () => {
      const params = new URLSearchParams("direction=123");
      validator!(params);
      expect(params.toString()).toBe("");
    });
  });

  (["condition", "search"] as LibraryParam[]).map((param) =>
    describe(param, () => {
      it("accepts everything as of now", () => {
        const { validator } = LIBRARY_SEARCH_PARAMS[param];
        expect(validator).toBeUndefined();
      });
    }),
  );

  // Use the same validator
  describe("dates & dateRange", () => {
    const { validator } = LIBRARY_SEARCH_PARAMS.dates;
    it("is the same validator as dateRange", () => {
      expect(validator).toStrictEqual(
        LIBRARY_SEARCH_PARAMS.dateRange.validator,
      );
    });
    it("accepts a standard range", () => {
      const params = new URLSearchParams("dateRange=last-7-days");
      validator!(params);
      expect(params.toString()).toBe("dateRange=last-7-days");
    });
    it("accepts a custom range", () => {
      const params = new URLSearchParams(
        "dateRange=custom&dates=2023-01-01|2024-01-01",
      );
      validator!(params);
      expect(params.toString()).toBe(
        "dateRange=custom&dates=2023-01-01%7C2024-01-01",
      );
    });
    it("rejects nonsense headers for dates", () => {
      const params = new URLSearchParams("dates=123");
      validator!(params);
      expect(params.toString()).toBe("");
    });
    it("rejects headers for dates without range", () => {
      const params = new URLSearchParams("dates=2023-01-01|2023-01-01");
      validator!(params);
      expect(params.toString()).toBe("");
    });
    it("rejects nonsense headers for dateRange", () => {
      const params = new URLSearchParams("dateRange=123");
      validator!(params);
      expect(params.toString()).toBe("");
    });
    it("rejects bad combination of valid headers", () => {
      const params = new URLSearchParams(
        "dateRange=last-7-days&dates=2023-01-01|2024-01-01",
      );
      validator!(params);
      expect(params.toString()).toBe("dateRange=last-7-days");
    });
    it("rejects bad combination of partially invalid headers", () => {
      const params = new URLSearchParams("dateRange=last-7-days&dates=");
      validator!(params);
      expect(params.toString()).toStrictEqual("dateRange=last-7-days");
    });
    it("rejects custom date where end date is before start date", () => {
      const params = new URLSearchParams(
        "dateRange=custom&dates=2025-01-01|2024-01-01",
      );
      validator!(params);
      expect(params.toString()).toStrictEqual("");
    });
  });
});
