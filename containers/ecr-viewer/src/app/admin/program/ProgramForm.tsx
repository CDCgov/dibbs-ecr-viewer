"use client";
import React, { useState } from "react";

import {
  Button,
  Checkbox,
  RequiredMarker,
  TextInput,
} from "@trussworks/react-uswds";

import { FieldSet } from "@/app/components/forms/FieldSet";
import { FormPageContent } from "@/app/components/forms/FormPageContent";
import { ConditionReference } from "@/app/data/metadataDb/types/core";
import { toKebabCase } from "@/app/utils/format-utils";
import { ExpandCollapseAccordionControlled } from "@/app/view-data/components/ExpandCollapseAccordion";
import { AccordionItem } from "@/app/view-data/types";

interface FormCondition extends ConditionReference {
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
            <Button
              type="button"
              outline={true}
              disabled={numSelected === numConditions}
              onClick={() =>
                setConditionCategories({
                  ...conditionCategories,
                  [category]: conditionCategories[category].map((c) => ({
                    ...c,
                    checked: true,
                  })),
                })
              }
            >
              Select all
            </Button>
            <Button
              type="button"
              outline={true}
              disabled={numSelected === 0}
              className="margin-top-0"
              onClick={() =>
                setConditionCategories({
                  ...conditionCategories,
                  [category]: conditionCategories[category].map((c) => ({
                    ...c,
                    checked: false,
                  })),
                })
              }
            >
              Deselect all
            </Button>
            {conditions.map((condition, i) => (
              <React.Fragment key={`condition-${condition.code}`}>
                {i !== 0 && <div className="section__line_light_gray" />}
                <Checkbox
                  id={`condition-${condition.code}`}
                  name="conditions"
                  value={condition.code}
                  label={condition.condition_name}
                  checked={condition.checked === true}
                  onChange={(e) =>
                    setConditionCategories({
                      ...conditionCategories,
                      [category]: conditionCategories[category].map((c) =>
                        c.code === condition.code
                          ? { ...c, checked: e.target.checked }
                          : c,
                      ),
                    })
                  }
                />
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
