"use client";
import React, { ReactNode, RefObject, useRef, useState } from "react";

import {
  Button,
  ButtonGroup,
  Checkbox,
  ModalFooter,
  ModalHeading,
  ModalRef,
  ModalToggleButton,
  RequiredMarker,
  TextInput,
} from "@trussworks/react-uswds";

import { FieldSet } from "@/app/components/forms/FieldSet";
import { FormPageContent } from "@/app/components/forms/FormPageContent";
import { ServerActionResult } from "@/app/services/errorService";
import { ListedCondition } from "@/app/services/listConditionsService";
import { toKebabCase, makePlural } from "@/app/utils/format-utils";
import { ExpandCollapseAccordionControlled } from "@/app/view-data/components/ExpandCollapseAccordion";
import { AccordionItem } from "@/app/view-data/types";
import { Modal } from "@/components/Modal";

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
        return await submitAction(name, selectedConditions);
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
      [category]: conditionCategories[category].map((c) =>
        // a null condition indicates all conditions should be checked
        !condition || c.code === condition.code ? { ...c, checked } : c,
      ),
    });
  };

  const accordionItems: AccordionItem[] = Object.keys(conditionCategories)
    .sort()
    .map((category) => {
      const conditions = conditionCategories[category];
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
                      label={condition.condition_name}
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
                      <span className="text-base">
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

  return (
    <FieldSet legend="Add conditions">
      <span>
        Select a minimum of 1 condition
        <RequiredMarker />
      </span>
      <p className="text-bold font-size-md">
        {numConditionsSelected} condition
        {makePlural(numConditionsSelected)} selected
      </p>
      <ExpandCollapseAccordionControlled
        descriptor="condition categories"
        className="accordion-dibbs margin-top-3"
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
            ? conditionCategories[confirmingCategory].filter(
                (c) =>
                  !!c.program_area_uuid && c.program_area_uuid !== progUuid,
              )
            : []
        }
      />
    </FieldSet>
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
      forceAction={true}
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
            <ConfirmationFooter
              modalRef={modalRef}
              onClose={onClose}
              onConfirm={onConfirm}
            >
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

            <ConfirmationFooter
              modalRef={modalRef}
              onClose={onClose}
              onConfirm={onConfirm}
            >
              Yes, add all conditions
            </ConfirmationFooter>
          </>
        ))}
    </Modal>
  );
};

const ConfirmationFooter = ({
  onConfirm,
  onClose,
  children,
  modalRef,
}: {
  onConfirm: () => void;
  onClose: () => void;
  children: ReactNode;
  modalRef: RefObject<ModalRef>;
}) => {
  return (
    <ModalFooter>
      <p>Are you sure you want to continue?</p>
      <ButtonGroup className="flex-justify-end">
        <ModalToggleButton
          modalRef={modalRef}
          closer={true}
          outline={true}
          data-focus={true}
          className="padding-105 text-center"
          onClick={onClose}
        >
          Cancel
        </ModalToggleButton>
        <ModalToggleButton
          modalRef={modalRef}
          closer={true}
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {children}
        </ModalToggleButton>
      </ButtonGroup>
    </ModalFooter>
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
