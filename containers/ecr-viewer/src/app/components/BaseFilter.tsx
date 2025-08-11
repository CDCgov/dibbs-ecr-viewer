import React, {
  ComponentType,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";

import { Button, Label } from "@trussworks/react-uswds";
import classnames from "classnames";

import {
  makePlural,
  toKebabCase,
  toSentenceCase,
} from "@/app/utils/format-utils";

import {
  FILTER_CLOSED,
  FILTER_SUBMITTED,
  FilterOpenContext,
} from "./FilterGroup";

/**
 * A reusable Filter component for eCR Library. It displays a button
 * that toggles a dropdown form for filtering data. The form includes functionality
 * for resetting and submitting the filter.
 * @param props - The props for the Filter component.
 * @param props.isActive - Boolean to indicate if a filter is actively filtering eCRs.
 * @param props.type - Type of the filter (e.g., "Received Date", "Reportable Condition").
 * @param props.title - Title text displayed on the button; defaults to `type`.
 * @param props.icon - Icon component rendered inside the filter button.
 * @param props.tag - Optional tag element displayed next to the title.
 * @param props.touched - Optional, but should be used when `submitHandler` is passed. Indicates
 * whether the filter options have been edited by the user
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
  touched = true,
  resetHandler,
  submitHandler,
  children,
}: {
  isActive: boolean;
  type: string;
  title?: string;
  icon: ComponentType<{ className?: string }>;
  tag?: ReactNode;
  touched?: boolean;
  resetHandler: () => void;
  submitHandler?: () => void;
  children: ReactNode;
}) => {
  const { filterBoxOpen, setFilterBoxOpen, lastOpenButtonRef } =
    useContext(FilterOpenContext);
  const openBtnRef = useRef<HTMLElement | null>(null);

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

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <div className="position-relative display-flex flex-column">
        <Button
          className={`margin-right-0 ${
            isActive ? "filters-applied" : "filter-button"
          }`}
          aria-label={
            `Filter by ${type}` + getSelectedFiltersLabel(isActive, title, tag)
          }
          aria-haspopup="listbox"
          aria-expanded={isFilterBoxOpen}
          onClick={() => {
            setIsFilterBoxOpen(!isFilterBoxOpen);
          }}
          type="button"
        >
          <span ref={openBtnRef} className="square-205 usa-icon">
            <IconTag aria-hidden={true} className="square-205" />
          </span>
          <span className="text-ink">{title || toSentenceCase(type)}</span>
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
          <form
            className={classnames(
              "usa-combo-box top-full left-0 position-absolute shadow-2 border-0 radius-md padding-0 margin-top-1 bg-white z-top filter-form maxh-6205",
              submitHandler && "minh-30",
            )}
            onSubmit={(e) => {
              e.preventDefault();
              submitHandler?.();
              setFilterBoxOpen(FILTER_SUBMITTED);
              openBtnRef?.current?.parentElement?.focus();
            }}
            onKeyDown={
              !submitHandler
                ? (e) => {
                    // If no submit button, enter doesn't do anything, so
                    // add a manual handler to still close out the box on enter
                    if (e.code === "Enter") {
                      e.preventDefault();
                      setIsFilterBoxOpen(false);
                    }
                  }
                : undefined
            }
          >
            <fieldset className="usa-combo-box filter-wrapper border-0 width-full">
              <FilterLegend type={type} />
              <div className="filter-content overflow-y-auto padding-y-1">
                {children}
              </div>
              {submitHandler && (
                <div className="filter-apply">
                  <div className="border-top-1px border-base-lighter" />
                  <ApplyFilterButton disabled={!touched} type={type} />
                </div>
              )}
            </fieldset>
          </form>
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
    <legend className="line-height-sans-6 text-bold font-sans-xs bg-white width-full padding-top-1 padding-left-105 padding-right-2 text-no-wrap">
      Filter by {type}
    </legend>
  );
};

/**
 * A button component for applying a filter.
 * @param props - React props
 * @param props.type - The type of filter
 * @param props.disabled - Whether the button is disabled
 * @returns - The rendered button element
 */
const ApplyFilterButton = ({
  type,
  disabled,
}: {
  type: string;
  disabled: boolean;
}) => {
  return (
    <div className="display-flex flex-column flex-stretch padding-x-105">
      <Button
        type="submit"
        className="margin-y-1 margin-x-0 padding-y-1 padding-x-205 flex-fill text-no-wrap"
        aria-label={`Apply filter for ${type}`}
        disabled={disabled}
      >
        Apply filter
      </Button>
    </div>
  );
};

const getSelectedFiltersLabel = (
  isActive: boolean,
  title?: string,
  tag?: ReactNode,
) => {
  if (isActive) {
    if (title?.length) {
      return `, ${title} selected`;
    }

    if (tag) {
      return `, ${tag} selected`;
    }
  }

  return "";
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
 * @param props.onDateChange - The function that is called when the date changes.
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

/**
 * Button to Select/Deselect all depending on form status.
 * @param props - The properties for the Select/Deselect all button.
 * @param props.groupName - The name of the group that's being selected/deselected.
 * @param props.onToggle - The callback function to handle the toggle event when the button is clicked.
 * @param props.numSelected - How many any are selected.
 * @param props.numOptions - How many are selectable.
 * @param props.className - optionally, classnames to pass to the button
 * @returns The rendered Select/Deselect all checkbox component.
 */
export const SelectDeselectAllButton = ({
  groupName,
  onToggle,
  numSelected,
  numOptions,
  className = "",
}: {
  groupName: string;
  onToggle: (isSelect: boolean) => void;
  numSelected: number;
  numOptions: number;
  className?: string;
}) => {
  const isAnySelected = numSelected > 0;
  const numBulkSelectable = isAnySelected ? numSelected : numOptions;
  return (
    <Button
      type="button"
      unstyled={true}
      disabled={numOptions === 0}
      className={classnames(
        "action-text font-size-xs margin-x-105 margin-bottom-1",
        className,
      )}
      onClick={() => onToggle(!isAnySelected)}
    >
      {numOptions === 0 ? "" : isAnySelected ? "Deselect " : "Select "}
      {numBulkSelectable} {groupName}
      {makePlural(numBulkSelectable)}
    </Button>
  );
};

/**
 * A group of checkbox button components, given a set of options.
 * @param props - The properties for the Checkbox group component.
 * @param props.groupName - The name of the checkbox buttons group.
 * @param props.filterItems - The option currently selected.
 * @param props.onChange - The callback function to handle the `onChange` event when the checkbox is clicked.
 * @returns The rendered checkbox group component.
 */
export const CheckboxOptions = ({
  groupName,
  filterItems,
  onChange,
}: {
  groupName: string;
  filterItems: { [key: string]: boolean };
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) => {
  return (
    <div className="position-relative bg-white overflow-y-auto maxh-38 display-flex flex-column gap-1 padding-x-105">
      {Object.keys(filterItems).map((item) => (
        <CheckboxInput
          key={item}
          id={`${groupName}-${item}`}
          name={item}
          value={item}
          checked={filterItems[item]}
          onChange={onChange}
          classNamesLabel="minw-40"
        />
      ))}
    </div>
  );
};

// Custom checkbox component to allow more customized styling
type CheckboxInputProps = {
  id: string;
  name: string;
  value: string;
  checked: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  classNamesDiv?: string;
  classNamesLabel?: string;
};

const CheckboxInput = ({
  id,
  name,
  value,
  checked,
  onChange,
  classNamesDiv = "",
  classNamesLabel = "",
}: CheckboxInputProps) => {
  return (
    <div
      className={classnames("checkbox-color", "usa-checkbox", classNamesDiv)}
    >
      <input
        id={id}
        className="usa-checkbox__input"
        type="checkbox"
        value={value}
        onChange={onChange}
        checked={checked}
      />
      <label
        className={classnames(
          "usa-checkbox__label",
          "line-height-sans-6",
          "font-sans-xs",
          "margin-y-0",
          classNamesLabel,
        )}
        htmlFor={id}
      >
        {name}
      </label>
    </div>
  );
};
