import { NextRequest, NextResponse } from "next/server";

import { INITIAL_HEADERS } from "@/app/constants";
import { isValidParamDates } from "@/app/utils/date-utils";
import { ChainableMiddleware, MiddlewareFactory } from "@/middleware";

// pulled out since its used for two params
const checkDates = (searchParams: URLSearchParams) => {
  const dateRange = searchParams.get("dateRange");
  const datesParam = searchParams.get("dates");
  if ((dateRange || datesParam) && !isValidParamDates(dateRange, datesParam)) {
    return ["dates", "dateRange"];
  }
};

// helper to make sure the param is a number that is greater than 0
const isPositiveInt = (paramName: string) => {
  return (searchParams: URLSearchParams) => {
    const param = searchParams.get(paramName) as string;
    const value = parseInt(param);
    if (Number.isNaN(value) || value < 1) {
      return [paramName];
    }
  };
};

// Mapping from param name to function that validates and returns a list of params to delete
const validations: {
  [key: string]: (searchParams: URLSearchParams) => string[] | undefined;
} = {
  itemsPerPage: isPositiveInt("itemsPerPage"),
  columnId(searchParams) {
    const param = searchParams.get("columnId") as string;
    const validIds = INITIAL_HEADERS.filter((h) => h.dataSortable).map(
      (h) => h.id,
    );
    if (!validIds.includes(param)) {
      // if we're deleteing the column, doesn't make sense to keep the direciton
      return ["columnId", "direction"];
    }
  },
  page: isPositiveInt("page"),
  direction(searchParams) {
    const param = searchParams.get("direction") as string;
    if (!["ASC", "DESC"].includes(param)) {
      return ["direction"];
    }
  },
  // condition(searchParams) {
  // TODO: is there anything that makes sense to check here or is invalid data here
  // relatively harmless?
  // },
  dates: checkDates,
  dateRange: checkDates,
};

/**
 * Checks that all URL params are valid and deletes them and rewrites the url if not
 * @param next The next middleware to call
 * @returns middleware function
 */
export const withUrlParamChecks: MiddlewareFactory = (
  next: ChainableMiddleware,
) => {
  return async function (request: NextRequest) {
    const url = request.nextUrl.clone();
    let changed = false;
    for (const [param, validator] of Object.entries(validations)) {
      if (url.searchParams.has(param)) {
        const toDelete = validator(url.searchParams) ?? [];
        toDelete.forEach((p) => {
          url.searchParams.delete(p);
          changed = true;
        });
      }
    }

    if (changed) {
      return NextResponse.redirect(url);
    } else {
      return next(request);
    }
  };
};
