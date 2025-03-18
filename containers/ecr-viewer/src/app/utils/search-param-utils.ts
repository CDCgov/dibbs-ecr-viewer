import { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

import { DEFAULT_ITEMS_PER_PAGE, INITIAL_HEADERS } from "@/app/constants";

import {
  CustomDateRangeOption,
  DEFAULT_DATE_RANGE,
  DateRangeOption,
  isValidParamDates,
} from "./date-utils";

/**
 * A function, which given the search params, makes the search params valid, typically
 * by deleting offending params
 */
type ValidationFn = (searchParams: URLSearchParams) => void;

export type PageSearchParams = { [key: string]: string | string[] | undefined };

// helper to check date paramaters are valid, used for both params
const checkDates: ValidationFn = (searchParams: URLSearchParams) => {
  const dateRange = searchParams.get("dateRange");
  const datesParam = searchParams.get("dates");
  if ((dateRange || datesParam) && !isValidParamDates(dateRange, datesParam)) {
    searchParams.delete("dates");
    searchParams.delete("dateRange");
  } else if (dateRange !== CustomDateRangeOption && datesParam !== null) {
    searchParams.delete("dates");
  }
};

// helper to make sure the param is a number that is greater than 0
const isPositiveInt = (paramName: string): ValidationFn => {
  return (searchParams: URLSearchParams) => {
    const param = searchParams.get(paramName) as string;
    const value = parseInt(param);
    if (Number.isNaN(value) || value < 1) {
      searchParams.delete(paramName);
    }
  };
};

type LibraryConfig = {
  itemsPerPage: number;
  page: number;
  columnId: string;
  direction: string;
  condition: string | undefined;
  dates: string;
  dateRange: DateRangeOption;
  search: string;
};

export type LibraryParam = keyof LibraryConfig;

/**
 * Mapping from param name to default and function that validates and fixes search params
 */
export const LIBRARY_SEARCH_PARAMS: {
  [K in LibraryParam]: {
    default: LibraryConfig[K];
    validator?: ValidationFn;
  };
} = {
  itemsPerPage: {
    default: DEFAULT_ITEMS_PER_PAGE,
    validator: isPositiveInt("itemsPerPage"),
  },
  page: {
    default: 1,
    validator: isPositiveInt("page"),
  },
  columnId: {
    default: "date_created",
    validator: (searchParams) => {
      const param = searchParams.get("columnId") as string;
      const validIds = INITIAL_HEADERS.filter((h) => h.dataSortable).map(
        (h) => h.id,
      );
      if (!validIds.includes(param)) {
        // if we're deleteing the column, doesn't make sense to keep the direciton
        searchParams.delete("columnId");
        searchParams.delete("direction");
      }
    },
  },
  direction: {
    default: "DESC",
    validator: (searchParams) => {
      const param = searchParams.get("direction") as string;
      if (!["ASC", "DESC"].includes(param)) {
        searchParams.delete("direction");
      }
    },
  },
  condition: {
    default: undefined,
    // Middleware runs on the edge runtime, so we can't make db calls. Would need
    // to do a fetch to the API conditions endpoint to get the valid conditions
    // and filter by. This may be worth it in the future, but not today.
  },
  dates: {
    default: "",
    validator: checkDates,
  },
  dateRange: {
    default: DEFAULT_DATE_RANGE,
    validator: checkDates,
  },
  search: {
    default: "",
  },
};

const getSearchParam = <K extends LibraryParam>(
  searchParams: PageSearchParams,
  key: K,
  altDefault?: string | undefined,
): LibraryConfig[K] => {
  const rawVal = searchParams[key];
  let singleVal: string | undefined;
  if (Array.isArray(rawVal)) {
    console.error(
      `got unexpected array value for search param ${key}, taking first`,
    );
    singleVal = rawVal[0];
  } else {
    singleVal = rawVal;
  }

  let val: LibraryConfig[K] | undefined;
  let altDefaultVal: LibraryConfig[K] | undefined;
  const defaultVal = LIBRARY_SEARCH_PARAMS[key]?.default;
  if (typeof defaultVal === "number") {
    (val as number) = Number(singleVal);
    (altDefaultVal as number) = Number(altDefault);
  } else {
    (val as string | undefined) = singleVal;
    (altDefaultVal as string | undefined) = altDefault;
  }

  // Allow empty strings to return if explicitly sent
  if (val === "" || val) {
    return val;
  } else if (altDefaultVal) {
    return altDefaultVal;
  } else {
    return defaultVal;
  }
};

/**
 * Get the library config with all search params populated with values or defaults
 * @param searchParams - The page's search params
 * @param cookieStore - The cookie store from the request
 * @returns the library config
 */
export const getLibraryConfig = (
  searchParams: PageSearchParams,
  cookieStore: ReadonlyRequestCookies,
): LibraryConfig => {
  const keys = Object.keys(LIBRARY_SEARCH_PARAMS) as LibraryParam[];
  const config = keys.reduce(
    <K extends LibraryParam>(acc: Partial<LibraryConfig>, key: K) => {
      acc[key] = getSearchParam(searchParams, key, cookieStore.get(key)?.value);
      return acc;
    },
    {},
  );

  return config as LibraryConfig;
};
