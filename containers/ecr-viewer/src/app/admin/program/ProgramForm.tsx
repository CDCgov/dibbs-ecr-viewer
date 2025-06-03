"use client";
import React, { RefObject, useRef, useState } from "react";

import {
  Button,
  Checkbox,
  ModalHeading,
  ModalRef,
  RequiredMarker,
  TextInput,
} from "@trussworks/react-uswds";

import { Search } from "@/app/components/Icon";
import { FieldSet } from "@/app/components/forms/FieldSet";
import { FormPageContent } from "@/app/components/forms/FormPageContent";
import ConfirmationFooter from "@/app/components/modal/ConfirmationFooter";
import Modal from "@/app/components/modal/Modal";
import { ToastContext } from "@/app/components/toast/ToastProvider";
import { ServerActionResult } from "@/app/services/errorService";
import { ListedCondition } from "@/app/services/listConditionsService";
import { makePlural, toKebabCase } from "@/app/utils/format-utils";
import { ExpandCollapseAccordionControlled } from "@/app/view-data/components/ExpandCollapseAccordion";
import { AccordionItem } from "@/app/view-data/types";

interface FormCondition extends ListedCondition {
  checked?: boolean;
}

type ConditionCategories = Record<string, FormCondition[]>;

interface FormValues {
  name?: string;
  conditions: FormCondition[];
}

const groupByCategory = (conditions: FormCondition[]) => {
  return conditions.reduce((acc, cur) => {
    const category = cur.condition_category || "Unknown";
    acc[category] ||= [] as FormCondition[];
    acc[category].push(cur);
    acc[category].sort((a, b) =>
      a.condition_name < b.condition_name ? -1 : 1,
    );
    return acc;
  }, {} as ConditionCategories);
};

/**
 *
 * @param props React props
 * @param props.initValues Initial values the form is set to
 * @param props.action Action of the form (e.g. "Create", "Edit")
 * @param props.progUuid UUID of the program being editted. Optional
 * @param props.submitAction Handler for the submitted data
 * @returns Program area add/edit form
 */
export const ProgramForm = ({
  action,
  initValues,
  progUuid,
  submitAction,
}: {
  action: string;
  initValues: FormValues;
  progUuid?: string;
  submitAction: (
    name: string,
    conditions: string[],
  ) => Promise<ServerActionResult<string | undefined>>;
}) => {
  const [name, setName] = useState(initValues.name || "");
  const [conditionCategories, setConditionCategories] = useState(
    groupByCategory(initValues.conditions),
  );
  const { createToast } = React.useContext(ToastContext);

  const selectedConditions = Object.values(conditionCategories)
    .flatMap((id) => id)
    .filter(({ checked }) => !!checked)
    .map(({ code }) => code);
  const numConditionsSelected = selectedConditions.length;

  const valid = !!name.trim() && numConditionsSelected > 0;

  return (
    <FormPageContent
      action={`${action} program area`}
      formValid={valid}
      submitAction={async () => {
        const res = await submitAction(name, selectedConditions);
        if (!res.error) createToast(`${name} successfully saved`, "success");
        return res;
      }}
      successRoute="/admin/program"
    >
      <NameFieldSet name={name} setName={setName} />
      <ConditionFieldSet
        progUuid={progUuid}
        conditionCategories={conditionCategories}
        setConditionCategories={setConditionCategories}
        numConditionsSelected={numConditionsSelected}
      />
    </FormPageContent>
  );
};

const NameFieldSet = ({
  name,
  setName,
}: {
  name: string;
  setName: (n: string) => void;
}) => {
  return (
    <FieldSet legend="Name program area">
      <span>
        Required fields are marked with an asterisk (<RequiredMarker />)
      </span>
      <label className="usa-label">
        Program area name
        <RequiredMarker />
        <TextInput
          type="text"
          required={true}
          id="name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
    </FieldSet>
  );
};

const ConditionFieldSet = ({
  progUuid,
  conditionCategories,
  setConditionCategories,
  numConditionsSelected,
}: {
  progUuid?: string;
  numConditionsSelected: number;
  conditionCategories: ConditionCategories;
  setConditionCategories: (c: ConditionCategories) => void;
}) => {
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >(keysToBoolean(conditionCategories, true));
  const [searchTerm, setSearchTerm] = useState("");

  const filteredConditionCategories = Object.keys(conditionCategories).reduce(
    (acc, cur) => {
      acc[cur] = conditionCategories[cur].filter(
        (c) =>
          !searchTerm ||
          c.condition_name.toLowerCase().includes(searchTerm.toLowerCase()),
      );
      return acc;
    },
    {} as ConditionCategories,
  );

  const modalRef = useRef<ModalRef>(null);

  const [confirmingCondition, setConfirmingCondition] =
    useState<FormCondition | null>(null);
  const [confirmingCategory, setConfirmingCategory] = useState<string | null>(
    null,
  );

  const setCondition = (
    category: string,
    condition: FormCondition | null,
    checked: boolean,
  ) => {
    setConditionCategories({
      ...conditionCategories,
      [category]: conditionCategories[category].map((c) => {
        // a null condition indicates all conditions should be checked
        // Only allow checking of filtered conditions (aka visible)
        if (
          (!condition || c.code === condition.code) &&
          filteredConditionCategories[category].includes(c)
        ) {
          return { ...c, checked };
        } else {
          return c;
        }
      }),
    });
  };

  const accordionItems: AccordionItem[] = Object.keys(conditionCategories)
    .sort()
    .filter((category) => filteredConditionCategories[category].length > 0)
    .map((category) => {
      const conditions = filteredConditionCategories[category];
      const numConditions = conditions.length;
      const numSelected = conditions.filter(({ checked }) => checked).length;
      return {
        title: (
          <div className="display-flex flex-justify flex-align-center">
            <div>
              <strong>{category}</strong>
              <br />
              <span className="text-base">RCKMS condition category</span>
            </div>

            <span>
              {numSelected}/{numConditions} conditions selected
            </span>
          </div>
        ),
        content: (
          <>
            {[
              { type: "Select", checked: true },
              { type: "Deselect", checked: false },
            ].map(({ type, checked }) => (
              <Button
                key={type}
                type="button"
                outline={true}
                onClick={(e) => {
                  if (
                    !checked ||
                    conditions.every(
                      (c) =>
                        !c.program_area_uuid ||
                        c.program_area_uuid === progUuid ||
                        c.checked,
                    )
                  ) {
                    setCondition(category, null, checked);
                  } else {
                    setConfirmingCategory(category);
                    modalRef.current?.toggleModal(e, true);
                  }
                }}
                aria-controls={conditions
                  .map(({ code }) => `condition-${code}`)
                  .join(" ")}
                className="margin-top-0"
              >
                {type} all
              </Button>
            ))}
            {conditions.map((condition, i) => {
              const hasDuplicateName =
                conditions.filter(
                  (c) => c.condition_name === condition.condition_name,
                ).length > 1;
              const isAlreadyAssigned =
                condition.program_area_uuid &&
                condition.program_area_uuid !== progUuid;
              return (
                <React.Fragment key={`condition-${condition.code}`}>
                  {i !== 0 && <div className="section__line_light_gray" />}
                  <div className="display-flex flex-justify">
                    <Checkbox
                      id={`condition-${condition.code}`}
                      name="conditions"
                      value={condition.code}
                      label={
                        <div>
                          <p className="margin-0">{condition.condition_name}</p>
                          {hasDuplicateName && (
                            <p className="margin-0">
                              <i className="text-base">
                                {condition.concept_name ||
                                  `SNOMED ${condition.code}`}
                              </i>
                            </p>
                          )}
                        </div>
                      }
                      checked={condition.checked === true}
                      aria-controls={
                        isAlreadyAssigned && !condition.checked
                          ? modalRef.current?.modalId
                          : undefined
                      }
                      onClick={(e) => {
                        // modal requires click event
                        if (isAlreadyAssigned && !condition.checked) {
                          setConfirmingCondition(condition);
                          setConfirmingCategory(category);
                          modalRef.current?.toggleModal(e, true);
                        }
                      }}
                      onChange={(e) => {
                        // React requires on change handler
                        if (!isAlreadyAssigned || condition.checked) {
                          setCondition(category, condition, e.target.checked);
                        }
                      }}
                    />
                    {isAlreadyAssigned && (
                      <span className="text-base line-height-13">
                        Condition in {condition.program_area_name}
                      </span>
                    )}
                  </div>
                </React.Fragment>
              );
            })}
          </>
        ),
        id: toKebabCase(category),
        expanded: !!expandedCategories[toKebabCase(category)],
        headingLevel: "h3",
      };
    });

  const numResults = Object.values(filteredConditionCategories).reduce(
    (total, cur) => total + cur.length,
    0,
  );

  return (
    <FieldSet legend="Add conditions">
      <span>
        Select a minimum of 1 condition
        <RequiredMarker />
      </span>
      <div className="display-flex flex-justify margin-top-3">
        <p className="text-bold font-size-md margin-y-0">
          {numConditionsSelected} condition
          {makePlural(numConditionsSelected)} selected
        </p>
        <SearchField
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          numResults={numResults}
        />
      </div>
      <ExpandCollapseAccordionControlled
        descriptor="condition categories"
        className="accordion-dibbs margin-top-3 margin-bottom-1"
        handleToggle={(categoryId) =>
          setExpandedCategories({
            ...expandedCategories,
            [categoryId]: !expandedCategories[categoryId],
          })
        }
        handleToggleAll={(expanded) =>
          setExpandedCategories(keysToBoolean(conditionCategories, expanded))
        }
        items={accordionItems}
      />
      <ConfirmationModal
        modalRef={modalRef}
        confirmingCategory={confirmingCategory}
        confirmingCondition={confirmingCondition}
        onClose={() => {
          setConfirmingCondition(null);
          setConfirmingCategory(null);
        }}
        onConfirm={() =>
          setCondition(confirmingCategory!, confirmingCondition!, true)
        }
        categoryConditions={
          !!confirmingCategory
            ? filteredConditionCategories[confirmingCategory].filter(
                (c) =>
                  !!c.program_area_uuid && c.program_area_uuid !== progUuid,
              )
            : []
        }
      />
    </FieldSet>
  );
};

const SearchField = ({
  searchTerm,
  setSearchTerm,
  numResults,
}: {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  numResults: number;
}) => {
  return (
    <div className="live-search">
      {searchTerm && (
        <p aria-live="polite" className="result-count">
          {numResults} result{makePlural(numResults)}
        </p>
      )}
      <Search aria-hidden={true} className="square-3 text-base" />
      <TextInput
        type="search"
        aria-label="Search conditions"
        id="condition-search"
        name="condition-search"
        placeholder="Search conditions"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
    </div>
  );
};

const ConfirmationModal = ({
  confirmingCategory,
  confirmingCondition,
  categoryConditions,
  onClose,
  onConfirm,
  modalRef,
}: {
  confirmingCategory: string | null;
  confirmingCondition: FormCondition | null;
  categoryConditions: FormCondition[];
  onClose: () => void;
  onConfirm: () => void;
  modalRef: RefObject<ModalRef>;
}) => {
  return (
    <Modal
      id="confirm-condition"
      ref={modalRef}
      aria-labelledby="confirm-condition-heading"
      aria-describedby="confirm-condition-description"
      onClose={onClose}
    >
      {confirmingCategory &&
        (confirmingCondition ? (
          <>
            <ModalHeading id="confirm-condition-heading">
              Are you sure you want to add {confirmingCondition?.condition_name}
              ?
            </ModalHeading>
            <p id="confirm-condition-description">
              A condition can only live in one program area. If you add{" "}
              {confirmingCondition?.condition_name} to this program area, it
              will be removed from the program area{" "}
              {confirmingCondition?.program_area_name}.
            </p>
            <ConfirmationFooter modalRef={modalRef} onConfirm={onConfirm}>
              Yes, add condition
            </ConfirmationFooter>
          </>
        ) : (
          <>
            <ModalHeading id="confirm-condition-heading">
              Are you sure you want to add all conditions from{" "}
              {confirmingCategory}?
            </ModalHeading>
            <div id="confirm-condition-description">
              <p>
                A condition can only live in one program area. If you add the
                below conditions to this program area, they will be removed from
                their current program area.
              </p>

              <ul>
                {categoryConditions.map(
                  ({ condition_name, program_area_name }) => (
                    <li key={condition_name}>
                      {condition_name}, {program_area_name}
                    </li>
                  ),
                )}
              </ul>
            </div>

            <ConfirmationFooter modalRef={modalRef} onConfirm={onConfirm}>
              Yes, add all conditions
            </ConfirmationFooter>
          </>
        ))}
    </Modal>
  );
};

const keysToBoolean = <T extends object>(obj: T, val: boolean) => {
  return Object.keys(obj).reduce(
    (acc, cur) => {
      acc[toKebabCase(cur)] = val;
      return acc;
    },
    {} as Record<string, boolean>,
  );
};
