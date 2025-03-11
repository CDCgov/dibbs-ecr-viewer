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
        const actual = validator!(new URLSearchParams(`${param}=-1`));
        expect(actual).toStrictEqual([param]);
      });
      it("rejects a zero number", () => {
        const actual = validator!(new URLSearchParams(`${param}=0`));
        expect(actual).toStrictEqual([param]);
      });
      it("accepts a positive number", () => {
        const actual = validator!(new URLSearchParams(`${param}=3`));
        expect(actual).toBeUndefined();
      });
      it("rejects a non-number", () => {
        const actual = validator!(new URLSearchParams(`${param}=abc`));
        expect(actual).toStrictEqual([param]);
      });
    }),
  );

  describe("columnId", () => {
    const { validator } = LIBRARY_SEARCH_PARAMS.columnId;
    it("accepts sortable headers", () => {
      const actual = validator!(new URLSearchParams("columnId=date_created"));
      expect(actual).toBeUndefined();
    });
    it("rejects non-sortable headers", () => {
      const actual = validator!(new URLSearchParams("columnId=rule_summary"));
      expect(actual).toStrictEqual(["columnId", "direction"]);
    });
    it("rejects nonsense headers", () => {
      const actual = validator!(new URLSearchParams("columnId=123"));
      expect(actual).toStrictEqual(["columnId", "direction"]);
    });
  });

  describe("direction", () => {
    const { validator } = LIBRARY_SEARCH_PARAMS.direction;
    it("accepts ASC", () => {
      const actual = validator!(new URLSearchParams("direction=ASC"));
      expect(actual).toBeUndefined();
    });
    it("accepts DESC", () => {
      const actual = validator!(new URLSearchParams("direction=DESC"));
      expect(actual).toBeUndefined();
    });
    it("rejects nonsense headers", () => {
      const actual = validator!(new URLSearchParams("direction=123"));
      expect(actual).toStrictEqual(["direction"]);
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
      const actual = validator!(new URLSearchParams("dateRange=last-7-days"));
      expect(actual).toBeUndefined();
    });
    it("accepts a custom range", () => {
      const actual = validator!(
        new URLSearchParams("dateRange=custom&dates=2023-01-01|2024-01-01"),
      );
      expect(actual).toBeUndefined();
    });
    it("rejects nonsense headers", () => {
      const actual = validator!(new URLSearchParams("dates=123"));
      expect(actual).toStrictEqual(["dates", "dateRange"]);
    });
  });
});
