import React, {
  ComponentType,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import { Button, Label } from "@trussworks/react-uswds";
import { useSearchParams } from "next/navigation";
import {
  FILTER_CLOSED,
  FILTER_SUBMITTED,
  FilterOpenContext,
} from "@/app/components/Filters";
import { toKebabCase } from "@/app/utils/format-utils";

/**
 * A reusable Filter component for eCR Library. It displays a button
 * that toggles a dropdown form for filtering data. The form includes functionality
 * for resetting and submitting the filter.
 * @param props - The props for the Filter component.
 * @param props.isActive - Boolean to indicate if a filter is actively filtering eCRs.
 * @param props.type - Type of the filter (e.g., "Recieved Date", "Reportable Condition").
 * @param props.title - Title text displayed on the button; defaults to `type`.
 * @param props.icon - Icon component rendered inside the filter button.
 * @param props.tag - Optional tag element displayed next to the title.
 * @param props.resetHandler - Callback for resetting the filter.
 * @param props.submitHandler - Callback for applying the filter on form submission.
 * @param props.children - The filter form fields and content displayed in the dropdown.
 * @returns A JSX element for the filter with a dropdown form.
 */
export const Filter = ({
  isActive,
  type,
  title = "",
  icon: IconTag,
  tag = "",
  resetHandler,
  submitHandler,
  children,
}: {
  isActive: boolean;
  type: string;
  title?: string;
  icon: ComponentType<{ className?: string }>;
  tag?: ReactNode;
  resetHandler: () => void;
  submitHandler: () => void;
  children: ReactNode;
}) => {
  const { filterBoxOpen, setFilterBoxOpen, lastOpenButtonRef } =
    useContext(FilterOpenContext);
  const openBtnRef = useRef<HTMLElement | null>(null);
  const searchParams = useSearchParams();

  const isFilterBoxOpen = filterBoxOpen === type;
  const setIsFilterBoxOpen = useCallback((open: boolean) => {
    if (open) {
      setFilterBoxOpen(type);
      // Set the last open button to this button when we open it
      lastOpenButtonRef.current = openBtnRef.current?.parentElement || null;
    } else {
      setFilterBoxOpen(FILTER_CLOSED);
    }
    openBtnRef?.current?.parentElement?.focus();
  }, []);

  // This filter has closed. We need the special submitted case to prevent
  // a race condition with submitting and resetting if we try to do a reset
  // just after submitting.
  useEffect(() => {
    if (filterBoxOpen !== FILTER_SUBMITTED && filterBoxOpen !== type) {
      resetHandler();
    }
  }, [filterBoxOpen]);

  // Force a reset if the search params update
  useEffect(resetHandler, [searchParams]);

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <div className="position-relative display-flex flex-column">
        <Button
          className={`margin-right-0 ${
            isActive ? "filters-applied" : "filter-button"
          }`}
          aria-label={`Filter by ${type}`}
          aria-haspopup="listbox"
          aria-expanded={isFilterBoxOpen}
          onClick={() => {
            setIsFilterBoxOpen(!isFilterBoxOpen);
          }}
          type="button"
        >
          <span ref={openBtnRef} className="square-205 usa-icon">
            <IconTag aria-hidden className="square-205" />
          </span>
          <span className="text-ink">{title || type}</span>
          {tag && (
            <span
              className="usa-tag padding-05 bg-base-darker radius-md"
              data-testid="filter-tag"
            >
              {tag}
            </span>
          )}
        </Button>

        {isFilterBoxOpen && (
          <div className="usa-combo-box top-full left-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitHandler();
                setFilterBoxOpen(FILTER_SUBMITTED);
                openBtnRef?.current?.parentElement?.focus();
              }}
            >
              <fieldset className="usa-combo-box border-0 padding-0 margin-top-1 bg-white position-absolute radius-md shadow-2 z-top maxh-6205 width-full">
                <FilterLegend type={type} />
                {children}
                <ApplyFilterButton type={type} />
              </fieldset>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * A component to render a filter legend (title).
 * @param props - React props
 * @param props.type - The type of filter
 * @returns - The rendered legend element
 */
const FilterLegend = ({ type }: { type: string }) => {
  return (
    <legend className="line-height-sans-6 text-bold font-sans-xs bg-white width-full padding-y-1 padding-x-105 text-no-wrap">
      Filter by {type}
    </legend>
  );
};

/**
 * A button component for applying a filter.
 * @param props - React props
 * @param props.type - The type of filter
 * @returns - The rendered button element
 */
const ApplyFilterButton = ({ type }: { type: string }) => {
  return (
    <div className="display-flex flex-column flex-stretch padding-x-105">
      <Button
        type="submit"
        className="margin-y-1 margin-x-0 padding-y-1 padding-x-205 flex-fill text-no-wrap"
        aria-label={`Apply Filter for ${type}`}
      >
        Apply Filter
      </Button>
    </div>
  );
};

/**
 * A reusable radio button component, used for the filter by date feature.
 * @param props - The properties for the RadioDateOption component.
 * @param props.groupName - The name of the radio button group.
 * @param props.option - The value of the radio option.
 * @param props.label - The label to display next to the radio button.
 * @param props.onChange - The callback function to handle the `onChange` event when the radio button is clicked.
 * @param props.isChecked - Determines if the radio button is selected based on the current state.
 * @param props.classNames - (Optional) Additional custom CSS class names to apply to the radio button wrapper.
 * @returns The rendered RadioDateOption component.
 */
export const RadioDateOption = ({
  groupName,
  option,
  label,
  onChange,
  isChecked,
  classNames,
}: {
  groupName: string;
  option: string;
  label: string;
  onChange: (value: string) => void;
  isChecked: boolean;
  classNames?: string;
}) => {
  return (
    <div className={`checkbox-color usa-radio padding-x-105 ${classNames}`}>
      <input
        id={`${groupName}-${option}`}
        className="usa-radio__input"
        type="radio"
        name={`${groupName}-options`}
        value={option}
        onChange={(e) => onChange(e.target.value)}
        checked={isChecked}
      />
      <label
        className="line-height-sans-6 font-sans-xs margin-y-0 usa-radio__label text-no-wrap"
        htmlFor={`${groupName}-${option}`}
      >
        {label}
      </label>
    </div>
  );
};

/**
 * A group of radio button components, given a set of options.
 * @param props - The properties for the RadioDateOption component.
 * @param props.groupName - The name of the radio button group.
 * @param props.optionsMap - A map with each option as the key, and the corresponding labels as the value.
 * @param props.onChange - The callback function to handle the `onChange` event when the radio button is clicked.
 * @param props.currentOption - The option currently selected.
 * @param props.classNames - (Optional) Additional custom CSS class names to apply to the radio button wrapper.
 * @returns The rendered RadioDateOption component.
 */
export const RadioDateOptions = ({
  groupName,
  optionsMap,
  onChange,
  currentOption,
  classNames,
}: {
  groupName: string;
  optionsMap: Record<string, string>;
  onChange: (value: string) => void;
  currentOption: string;
  classNames?: string;
}) => {
  return (
    <>
      {Object.entries(optionsMap).map(([option, label]) => (
        <RadioDateOption
          key={`${groupName}-${option}`}
          groupName={groupName}
          option={option}
          label={label}
          onChange={onChange}
          isChecked={currentOption === option}
          classNames={classNames}
        />
      ))}
    </>
  );
};

/**
 *  A custom date input component for selecting a date.
 * @param props - The properties for the CustomDateInput component.
 * @param props.label - The label of the custom date input component.
 * @param props.onDateChange - The function that is caulled when the date changes.
 * @param props.defaultValue - The default value of the date input.
 * @param props.isRequired - Boolean indicating whether or not the date is required.
 * @param props.minValue - The minimum value of the date input.
 * @returns A JSX element containing a date input field and corresponding label.
 */
export const CustomDateInput = ({
  label,
  onDateChange,
  defaultValue,
  isRequired,
  minValue,
}: {
  label: string;
  onDateChange: (date: string) => void;
  defaultValue: string;
  isRequired: boolean;
  minValue?: string;
}) => {
  const today = new Date().toLocaleDateString("en-CA");
  const id = toKebabCase(label);
  return (
    <div>
      <Label htmlFor={id} className="margin-top-1">
        {label}
      </Label>
      <input
        id={id}
        data-testid={id}
        type="date"
        className="usa-input width-card margin-top-0 border-base-dark"
        defaultValue={defaultValue}
        min={minValue}
        max={today}
        required={isRequired}
        aria-label={label}
        onChange={(e) => {
          const date = e.target.value;
          onDateChange(date);
        }}
      />
    </div>
  );
};
