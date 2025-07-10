"use client";
import React, { useEffect, useState } from "react";

import { useLibraryQueryParam } from "@/app/hooks/useQueryParam";
import { formatDateTime } from "@/app/services/formatDateService";
import {
  CustomDateRangeOption,
  DEFAULT_DATE_RANGE,
  DateRangeOption,
  DateRangeOptions,
  dateRangeLabels,
} from "@/app/utils/date-utils";

import {
  Filter,
  RadioDateOption,
  RadioDateOptions,
  CustomDateInput,
  SelectDeselectAllCheckbox,
  CheckboxOptions,
} from "./BaseFilter";
import FilterGroup from "./FilterGroup";
import { Coronavirus, Event } from "./Icon";

enum ParamName {
  Condition = "condition",
  DateRange = "dateRange",
  Dates = "dates",
}

interface FilterProps {
  allConditions: string[];
  initConditions: string[];
  initCustomDate: string;
  initDateRange: DateRangeOption;
}

/**
 * Functional component that renders Filters section in eCR Library.
 * Includes Filter component for reportable conditions.
 * @param props - props to pass to Filters
 * @returns The rendered Filters component.
 */
const Filters = (props: FilterProps) => {
  const { searchParams, deleteQueryParam, pushQueryUpdate } =
    useLibraryQueryParam();

  const paramKeys = Object.values(ParamName);
  const resetToDefault = () => {
    for (const key of paramKeys) {
      deleteQueryParam(key);
    }
    pushQueryUpdate();
  };

  return (
    <FilterGroup
      resetHandler={resetToDefault}
      resetEnabled={paramKeys.some((k) => searchParams.get(k) !== null)}
    >
      <FilterByDate {...props} />
      <FilterReportableConditions {...props} />
    </FilterGroup>
  );
};

/**
 * Functional component for filtering eCRs in the Library based on reportable conditions.
 * @param props - props to pass to FilterReportableConditions
 * @param props.allConditions - List of conditions to filter on
 * @param props.initConditions - List of conditions that are initially true (default undefined)
 * @returns The rendered FilterReportableConditions component.
 * - Users can select specific conditions or select all conditions.
 * - Updates the browser's query string when the filter is applied.
 */
const FilterReportableConditions = ({
  initConditions,
  allConditions,
}: FilterProps) => {
  const { updateQueryParam, pushQueryUpdate } = useLibraryQueryParam();

  const initFilterState = allConditions.reduce(
    (dict: { [key: string]: boolean }, condition: string) => {
      dict[condition] = initConditions.includes(condition);
      return dict;
    },
    {} as { [key: string]: boolean },
  );

  const [filterConditions, setFilterConditions] = useState(initFilterState);

  // Keep state in sync with updated params while maintaining correct focus on submit
  useEffect(() => setFilterConditions(initFilterState), [initConditions]);

  // Build list of conditions to filter on
  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = event.target;
    setFilterConditions((prev) => {
      return { ...prev, [value]: checked };
    });
  };

  const isAllSelected = Object.values(filterConditions).every(
    (val) => val === true,
  );

  // Check/Uncheck all boxes based on Select all checkbox
  const handleSelectAll = () => {
    const updatedConditions = Object.keys(filterConditions).reduce(
      (dict, condition) => {
        dict[condition] = !isAllSelected;
        return dict;
      },
      {} as { [key: string]: boolean },
    );

    setFilterConditions(updatedConditions);
  };

  return (
    <Filter
      type="reportable condition"
      isActive={!isAllSelected}
      resetHandler={() => setFilterConditions(initFilterState)}
      icon={Coronavirus}
      tag={
        Object.keys(filterConditions).filter(
          (key) => filterConditions[key] === true,
        ).length || "0"
      }
      submitHandler={() => {
        updateQueryParam(ParamName.Condition, filterConditions, isAllSelected);
        pushQueryUpdate();
      }}
    >
      {/* Select All checkbox */}
      <div className="display-flex flex-column">
        <SelectDeselectAllCheckbox
          groupName="condition"
          onToggle={handleSelectAll}
          isAllSelected={isAllSelected}
        />
        {allConditions.length > 0 && (
          <div className="border-top-1px border-base-lighter margin-x-105"></div>
        )}
        {/* Filter Conditions checkboxes */}
        <CheckboxOptions
          groupName="condition"
          filterItems={filterConditions}
          onChange={handleCheckboxChange}
        />
      </div>
      <div className="border-top-1px border-base-lighter"></div>
    </Filter>
  );
};

/**
 * Functional component for filtering eCRs in the Library based on date.
 * @param props component props
 * @param props.initCustomDate initial custom date value
 * @param props.initDateRange initial range option selected
 * @returns The rendered FilterByDate component.
 * - Users can select specific date ranges or specify a custom date range.
 * - Updates the browser's query string when the filter is applied.
 */
const FilterByDate = ({ initCustomDate, initDateRange }: FilterProps) => {
  const today = new Date().toLocaleDateString("en-CA");
  const { deleteQueryParam, updateQueryParam, pushQueryUpdate } =
    useLibraryQueryParam();
  const [filterDateOption, setFilterDateOption] =
    useState<string>(initDateRange);
  const [initStart, initEnd] = initCustomDate.split("|");
  const [startDate, setStartDate] = useState<string>(initStart);
  const [endDate, setEndDate] = useState<string>(initEnd);
  const isFilterDateDefault = filterDateOption === DEFAULT_DATE_RANGE;

  // Keep state in sync with updated params while maintaining correct focus on submit
  useEffect(() => {
    setStartDate(initStart);
    setEndDate(initEnd);
  }, [initCustomDate]);
  useEffect(() => {
    setFilterDateOption(initDateRange);
  }, [initDateRange]);

  const submitHandler = () => {
    if (filterDateOption === CustomDateRangeOption) {
      const actualEndDate = endDate || today;
      const datesParam = `${startDate}|${actualEndDate}`;
      updateQueryParam(
        ParamName.DateRange,
        filterDateOption,
        isFilterDateDefault,
      );
      updateQueryParam(ParamName.Dates, datesParam);
      pushQueryUpdate();
    } else {
      updateQueryParam(
        ParamName.DateRange,
        filterDateOption,
        isFilterDateDefault,
      );
      deleteQueryParam(ParamName.Dates);
      pushQueryUpdate();
    }
  };

  return (
    <Filter
      type="received date"
      isActive={true}
      resetHandler={() => {
        setStartDate(initStart);
        setEndDate(initEnd);
        setFilterDateOption(initDateRange);
      }}
      icon={Event}
      title={
        filterDateOption === CustomDateRangeOption
          ? startDate &&
            endDate &&
            `From ${formatDateTime(startDate)} to ${formatDateTime(endDate)}`
          : dateRangeLabels[filterDateOption as DateRangeOptions] || ""
      }
      submitHandler={submitHandler}
    >
      <div className="display-flex flex-column">
        <RadioDateOptions
          groupName="filter-date"
          optionsMap={dateRangeLabels}
          onChange={setFilterDateOption}
          currentOption={filterDateOption}
          classNames="padding-bottom-1"
        />
        <div className="border-top-1px border-base-lighter margin-x-105 padding-bottom-1"></div>
        <RadioDateOption
          groupName="filter-date"
          option={CustomDateRangeOption}
          label="Custom date range"
          onChange={setFilterDateOption}
          isChecked={filterDateOption === CustomDateRangeOption}
        />
        {filterDateOption === CustomDateRangeOption && (
          <div className="padding-x-105">
            <CustomDateInput
              label="Start date"
              onDateChange={setStartDate}
              defaultValue={startDate || ""}
              isRequired={true}
            />
            <CustomDateInput
              label="End date"
              onDateChange={setEndDate}
              defaultValue={endDate || ""}
              minValue={startDate || ""}
              isRequired={false}
            />
          </div>
        )}
      </div>
    </Filter>
  );
};

export default Filters;
