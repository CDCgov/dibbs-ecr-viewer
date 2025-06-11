"use client";
import React, {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { Button } from "@trussworks/react-uswds";

import { useLibraryQueryParam } from "@/app/hooks/useQueryParam";

import { Autorenew } from "./Icon";

// We use a context to communicate between the overall <Filters /> component
// and the `<Filter />` component to avoid prop drilling
type FilterOpenContextValue = {
  filterBoxOpen: string;
  setFilterBoxOpen: (v: string) => void;
  lastOpenButtonRef: { current: HTMLElement | null };
};
// We need the submitted case to differentiate from closing and prevent
// a race condition with submitting and resetting if we try to do a reset
// just after submitting.
export const FILTER_SUBMITTED = "__submitted__";
export const FILTER_CLOSED = "__closed__";

export const FilterOpenContext = createContext<FilterOpenContextValue>({
  filterBoxOpen: FILTER_CLOSED,
  setFilterBoxOpen: () => {},
  lastOpenButtonRef: { current: null },
});

/**
 * Functional component that renders a group of filters.
 * @param props - react props
 * @param props.paramKeys - search param keys controlled by these filters
 * @param props.children - filters in this filter group
 * @returns The rendered Filters component.
 */
const FilterGroup = ({
  paramKeys,
  children,
}: {
  paramKeys: string[];
  children: React.ReactNode;
}) => {
  const [filterBoxOpen, setFilterBoxOpen] = useState<string>(FILTER_CLOSED);
  const lastOpenButtonRef = useRef<HTMLElement | null>(null);
  const { searchParams, deleteQueryParam, pushQueryUpdate } =
    useLibraryQueryParam();

  const filterOpenContextValue = {
    filterBoxOpen,
    setFilterBoxOpen,
    lastOpenButtonRef,
  };

  const resetFilters = useCallback(() => {
    setFilterBoxOpen(FILTER_CLOSED);
  }, []);

  // When a filter is open, close it if the escape key is hit or a click happens
  // outside the <Filter /> component (implemented by stopping click propogation on <Filter />)
  useEffect(() => {
    if (filterBoxOpen !== FILTER_CLOSED && filterBoxOpen !== FILTER_SUBMITTED) {
      const handleEscapeFilters = (event: KeyboardEvent) => {
        if (event.code === "Escape") {
          resetFilters();

          // Return focus to the most recently selected open button
          lastOpenButtonRef.current?.focus();
          lastOpenButtonRef.current = null;
        }
      };

      window.addEventListener("keydown", handleEscapeFilters);
      window.addEventListener("click", resetFilters);
      return () => {
        window.removeEventListener("keydown", handleEscapeFilters);
        window.removeEventListener("click", resetFilters);
      };
    }
  }, [filterBoxOpen]);

  const resetToDefault = () => {
    for (const key of paramKeys) {
      deleteQueryParam(key);
    }
    pushQueryUpdate();
  };

  return (
    <div>
      <div className="border-top border-base-lighter"></div>
      <div className="margin-x-3 margin-y-105 display-flex flex-align-center gap-105">
        <span className="line-height-sans-6">FILTERS:</span>
        <FilterOpenContext.Provider value={filterOpenContextValue}>
          {children}
        </FilterOpenContext.Provider>

        {paramKeys.some((k) => searchParams.get(k) !== null) && (
          <Button
            type="button"
            unstyled={true}
            onClick={resetToDefault}
            aria-label="Reset Filters to Defaults"
            className="gap-05"
          >
            <span className="square-205 usa-icon">
              <Autorenew aria-hidden={true} className="square-205" />
            </span>
            Reset
          </Button>
        )}
      </div>
    </div>
  );
};

export default FilterGroup;
