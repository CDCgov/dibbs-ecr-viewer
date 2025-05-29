import {
  useRouter,
  usePathname,
  useSearchParams,
  ReadonlyURLSearchParams,
} from "next/navigation";

import { LibraryParam } from "@/app/utils/search-param-utils";

const copyParams = (params: URLSearchParams | ReadonlyURLSearchParams) =>
  new URLSearchParams(params.toString());

/**
 * Custom hook to manage query parameters in the URL (set, delete, and update). Hook by default, it resets page back to 1. This is currently specialized on the ecr library params, but could be made more abstract
 * down the road if needed
 * @param resets - array of params that should always be reset when updating the query
 * @returns - An object containing
 *  - searchParams: Current search params from the URL
 *  - updateQueryParam: Function to update a specific query parameter.
 *    If an object is passed, its keys that are set to true are concatenated with a |. Otherwise, the value is set directly.
 */
export const useQueryParam = (resets: LibraryParam[] = ["page"]) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // This is updated within render. If it isn't pushed by the end of the component's cycle,
  // then it resets.
  const curSearchParams = copyParams(searchParams);
  for (const key of resets) {
    curSearchParams.delete(key);
  }

  // Set a query param with a specific value
  const setQueryParam = (key: LibraryParam, value: string) => {
    curSearchParams.set(key, value);
  };

  // Delete a query param or a specific query param value
  const deleteQueryParam = (key: LibraryParam) => {
    curSearchParams.delete(key);
  };

  const pushQueryUpdate = () => {
    const keys = (
      [...searchParams.keys(), ...curSearchParams.keys()] as LibraryParam[]
    ).filter((k) => !resets.includes(k));
    if (
      keys.some((key) => searchParams.get(key) !== curSearchParams.get(key))
    ) {
      router.push(pathname + "?" + curSearchParams.toString());
    }
  };

  // Update a specific query param (set or delete if default)
  const updateQueryParam = (
    key: LibraryParam,
    value: string | { [key: string]: boolean },
    isDefault: boolean = false,
  ) => {
    if (typeof value === "object") {
      value = Object.keys(value)
        .filter((k) => (value as { [key: string]: boolean })[k] === true)
        .join("|");
    }
    isDefault ? deleteQueryParam(key) : setQueryParam(key, value);
  };

  return { searchParams, deleteQueryParam, updateQueryParam, pushQueryUpdate };
};
