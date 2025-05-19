"use client";
import React, { ReactNode, RefObject, useRef, useState } from "react";

import {
  Button,
  ButtonGroup,
  Checkbox,
  Modal,
  ModalFooter,
  ModalHeading,
  ModalRef,
  ModalToggleButton,
  RequiredMarker,
  TextInput,
} from "@trussworks/react-uswds";

import { FieldSet } from "@/app/components/forms/FieldSet";
import { FormPageContent } from "@/app/components/forms/FormPageContent";
import { ListedCondition } from "@/app/services/listConditionsService";
import { toKebabCase } from "@/app/utils/format-utils";
import { ExpandCollapseAccordionControlled } from "@/app/view-data/components/ExpandCollapseAccordion";
import { AccordionItem } from "@/app/view-data/types";

interface FormCondition extends ListedCondition {
  checked?: boolean;
}

type ConditionCateogires = Record<string, FormCondition[]>;

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
  }, {} as ConditionCateogires);
};

/**
 *
 * @param props React props
 * @param props.initValues Initial values the form is set to
 * @param props.action Action of the form (e.g. "Create", "Edit")
 * @param props.submitAction Handler for the submitted data
 * @returns Program area add/edit form
 */
export const ProgramForm = ({
  action,
  initValues,
  submitAction,
}: {
  action: string;
  initValues: FormValues;
  submitAction: (name: string, conditions: string[]) => Promise<void>;
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
        await submitAction(name, selectedConditions);
      }}
      successRoute="/admin/program"
    >
      <NameFieldSet name={name} setName={setName} />
      <ConditionFieldSet
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
  conditionCategories,
  setConditionCategories,
  numConditionsSelected,
}: {
  numConditionsSelected: number;
  conditionCategories: ConditionCateogires;
  setConditionCategories: (c: ConditionCateogires) => void;
}) => {
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >(keysToBoolean(conditionCategories, true));
  const modalRef = useRef<ModalRef>(null);
  const [confirmingCondition, setConfirmingCondtion] =
    useState<FormCondition | null>(null);
  const [confirmingCategory, setConfirmingCategory] = useState<string | null>(
    null,
  );

  const setCondition = (
    category: string,
    condition: FormCondition,
    checked: boolean,
  ) => {
    setConditionCategories({
      ...conditionCategories,
      [category]: conditionCategories[category].map((c) =>
        c.code === condition.code ? { ...c, checked } : c,
      ),
    });
  };

  const setCategory = (category: string, checked: boolean) => {
    setConditionCategories({
      ...conditionCategories,
      [category]: conditionCategories[category].map((c) => ({
        ...c,
        checked,
      })),
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
                      ({ program_area_name }) => !program_area_name,
                    )
                  ) {
                    setCategory(category, checked);
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
            {conditions.map((condition, i) => (
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
                      !!condition.program_area_name
                        ? modalRef.current?.modalId
                        : undefined
                    }
                    onClick={(e) => {
                      // modal requires click event
                      if (!condition.program_area_name || condition.checked)
                        return;

                      setConfirmingCondtion(condition);
                      setConfirmingCategory(category);
                      modalRef.current?.toggleModal(e, true);
                    }}
                    onChange={(e) => {
                      // React requires on change handler
                      if (!!condition.program_area_name && !condition.checked)
                        return;

                      setCondition(category, condition, e.target.checked);
                    }}
                  />
                  {!!condition.program_area_name && (
                    <span className="text-base">
                      Condition in {condition.program_area_name}
                    </span>
                  )}
                </div>
              </React.Fragment>
            ))}
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
        {numConditionsSelected === 1 ? "" : "s"} selected
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
                Are you sure you want to add{" "}
                {confirmingCondition?.condition_name}?
              </ModalHeading>
              <div id="confirm-condition-description">
                <p>
                  A condition can only live in one program area. If you add{" "}
                  {confirmingCondition?.condition_name} to this program area, it
                  will be removed from the program area,{" "}
                  {confirmingCondition?.program_area_name}.
                </p>

                <p>Are you sure you want to continue?</p>
              </div>
              <ConfirmationFooter
                modalRef={modalRef}
                onClick={() => {
                  setCondition(confirmingCategory!, confirmingCondition!, true);
                  setConfirmingCondtion(null);
                  setConfirmingCategory(null);
                }}
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
                  below conditions to this program area, they will be removed
                  from their program areas.
                </p>

                <ul>
                  {conditionCategories[confirmingCategory]
                    .filter((c) => !!c.program_area_name)
                    .map(({ condition_name, program_area_name }) => (
                      <li key={condition_name}>
                        {condition_name}, {program_area_name}
                      </li>
                    ))}
                </ul>

                <p>Are you sure you want to continue?</p>
              </div>

              <ConfirmationFooter
                modalRef={modalRef}
                onClick={() => {
                  setCategory(confirmingCategory!, true);
                  setConfirmingCategory(null);
                }}
              >
                Yes, add all conditions
              </ConfirmationFooter>
            </>
          ))}
      </Modal>
    </FieldSet>
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

const ConfirmationFooter = ({
  onClick,
  children,
  modalRef,
}: {
  onClick: () => void;
  children: ReactNode;
  modalRef: RefObject<ModalRef>;
}) => {
  return (
    <ModalFooter>
      <ButtonGroup className="flex-justify-end">
        <ModalToggleButton
          modalRef={modalRef}
          closer={true}
          outline={true}
          data-focus={true}
          className="padding-105 text-center"
        >
          Cancel
        </ModalToggleButton>
        <ModalToggleButton modalRef={modalRef} closer={true} onClick={onClick}>
          {children}
        </ModalToggleButton>
      </ButtonGroup>
    </ModalFooter>
  );
};
