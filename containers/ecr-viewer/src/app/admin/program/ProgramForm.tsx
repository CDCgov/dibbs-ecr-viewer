"use client";
import React, { useState } from "react";

import {
  Button,
  Checkbox,
  RequiredMarker,
  TextInput,
} from "@trussworks/react-uswds";

import { ConditionReference } from "@/app/data/metadataDb/types/core";
import { ExpandCollapseAccordionControlled } from "@/app/view-data/components/ExpandCollapseAccordion";
import { AccordionItem } from "@/app/view-data/types";

interface FormCondition extends ConditionReference {
  checked?: boolean;
}

interface FormValues {
  name?: string;
  conditions: FormCondition[];
}

const groupByCategory = (conditions: FormCondition[]) => {
  return conditions.reduce(
    (acc, cur) => {
      const category = cur.condition_category || "Unknown";
      acc[category] ||= [] as FormCondition[];
      acc[category].push(cur);
      acc[category].sort((a, b) =>
        a.condition_name < b.condition_name ? -1 : 1,
      );
      return acc;
    },
    {} as { [key: string]: FormCondition[] },
  );
};

/**
 *
 * @param props React props
 * @param props.initValues Initial values the form is set to
 * @param props.title Title of the form
 * @returns Program area add/edit form
 */
export const ProgramForm = ({
  title,
  initValues,
}: {
  title: string;
  initValues: FormValues;
}) => {
  const [name, setName] = useState(initValues.name || "");
  const [conditionCategories, setConditionCategories] = useState(
    groupByCategory(initValues.conditions),
  );

  const categoryToBoolean = (val: boolean) => {
    return Object.keys(conditionCategories).reduce(
      (acc, cur) => {
        acc[cur] = val;
        return acc;
      },
      {} as Record<string, boolean>,
    );
  };

  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >(categoryToBoolean(true));

  const setCondition = (category: string, code: string, checked: boolean) => {
    console.log({ category, code, checked });
    const nextConditionCategories = {
      ...conditionCategories,
      [category]: conditionCategories[category].map((c) =>
        c.code === code ? { ...c, checked } : c,
      ),
    };
    console.log({ nextConditionCategories, conditionCategories });
    setConditionCategories(nextConditionCategories);
  };

  const setCategory = (category: string, checked: boolean) => {
    console.log({ category, checked });
    const nextConditionCategories = {
      ...conditionCategories,
      [category]: conditionCategories[category].map((c) => ({ ...c, checked })),
    };
    setConditionCategories(nextConditionCategories);
  };

  const accordionItems: AccordionItem[] = Object.keys(conditionCategories)
    .sort()
    .map((category) => {
      const conditions = conditionCategories[category];
      return {
        title: (
          <div className="display-flex flex-justify">
            <Checkbox
              name="category"
              id={category}
              label={
                <div>
                  <strong>{category}</strong>
                  <br />
                  <span className="text-base">RCKMS condition category</span>
                </div>
              }
              checked={conditions.every(({ checked }) => !!checked)}
              onChange={(e) => {
                setCategory(category, e.target.checked);
              }}
            />

            <p>
              {conditions.filter(({ checked }) => checked).length}/
              {conditions.length} conditions selected
            </p>
          </div>
        ),
        content: conditions.map((condition, i) => (
          <React.Fragment key={`condition-${condition.code}`}>
            {i !== 0 && <div className="section__line_light_gray" />}
            <Checkbox
              id={`condition-${condition.code}`}
              name="conditions"
              label={condition.condition_name}
              checked={condition.checked === true}
              onChange={(e) => {
                setCondition(category, condition.code, e.target.checked);
              }}
            />
          </React.Fragment>
        )),
        id: category,
        expanded: !!expandedCategories[category],
        headingLevel: "h4",
      };
    });

  const numConditionsSelected = Object.values(conditionCategories)
    .flatMap((id) => id)
    .filter(({ checked }) => !!checked).length;

  const submitDisabled = !name.trim() || !numConditionsSelected;

  return (
    <>
      <div className="display-flex flex-justify margin-bottom-3">
        <h2 className="margin-0">{title}</h2>
        <div>
          <Button type="submit" className="margin-0" disabled={submitDisabled}>
            Create New Program Area
          </Button>
        </div>
      </div>

      <div className="section__line_gray" style={{ marginBottom: "1.5rem" }} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          console.log(e);
        }}
      >
        <fieldset className="dibbs-fieldset">
          <legend>Name program area</legend>
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
        </fieldset>
        <fieldset className="dibbs-fieldset">
          <legend>Add Conditions</legend>
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
            handleToggle={(category) =>
              setExpandedCategories({
                ...expandedCategories,
                [category]: !expandedCategories[category],
              })
            }
            handleToggleAll={(expanded) =>
              setExpandedCategories(categoryToBoolean(expanded))
            }
            items={accordionItems}
          />
        </fieldset>
        <div className="display-flex flex-justify-end margin-y-4">
          <Button type="submit" className="margin-0" disabled={submitDisabled}>
            Create New Program Area
          </Button>
        </div>
      </form>
    </>
  );
};
