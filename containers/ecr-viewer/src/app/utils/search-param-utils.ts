import { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

import { DEFAULT_ITEMS_PER_PAGE, INITIAL_HEADERS } from "@/app/constants";

import {
  DEFAULT_DATE_RANGE,
  DateRangeOption,
  isValidParamDates,
} from "./date-utils";

/**
 * A function, which given the search params, returns a list of search params to delete due
 * to invalid values
 */
type ValidationFn = (searchParams: URLSearchParams) => string[] | undefined;

export type PageSearchParams = { [key: string]: string | string[] | undefined };

// pulled out since its used for two params
const checkDates: ValidationFn = (searchParams: URLSearchParams) => {
  const dateRange = searchParams.get("dateRange");
  const datesParam = searchParams.get("dates");
  if ((dateRange || datesParam) && !isValidParamDates(dateRange, datesParam)) {
    return ["dates", "dateRange"];
  }
};

// helper to make sure the param is a number that is greater than 0
const isPositiveInt = (paramName: string): ValidationFn => {
  return (searchParams: URLSearchParams) => {
    const param = searchParams.get(paramName) as string;
    const value = parseInt(param);
    if (Number.isNaN(value) || value < 1) {
      return [paramName];
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

/**
 * Mapping from param name to default and function that validates and returns a list of params to delete
 */
export const LIBRARY_SEARCH_PARAMS: {
  [K in keyof LibraryConfig]: {
    default: LibraryConfig[K];
    validator?: ValidationFn;
  };
} = {
  itemsPerPage: {
    default: DEFAULT_ITEMS_PER_PAGE,
    // TODO: Is there a cutoff on the high end?
    validator: isPositiveInt("itemsPerPage"),
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
        return ["columnId", "direction"];
      }
    },
  },
  page: {
    default: 1,
    // TODO: check if too high
    validator: isPositiveInt("page"),
  },
  direction: {
    default: "DESC",
    validator: (searchParams) => {
      const param = searchParams.get("direction") as string;
      if (!["ASC", "DESC"].includes(param)) {
        return ["direction"];
      }
    },
  },
  condition: {
    default: undefined,
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

const getSearchParam = <K extends keyof LibraryConfig>(
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
  const keys = Object.keys(LIBRARY_SEARCH_PARAMS) as (keyof LibraryConfig)[];
  const config = keys.reduce(
    <K extends keyof LibraryConfig>(acc: Partial<LibraryConfig>, key: K) => {
      acc[key] = getSearchParam(searchParams, key, cookieStore.get(key)?.value);
      return acc;
    },
    {},
  );

  return config as LibraryConfig;
};
